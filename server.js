const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Criar diretórios necessários
const dataDir = path.join(__dirname, 'data');
const backupDir = path.join(dataDir, 'backup');
const uploadsDir = path.join(__dirname, 'uploads');
const categoriesDir = path.join(dataDir, 'categories');

fs.ensureDirSync(dataDir);
fs.ensureDirSync(backupDir);
fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(categoriesDir);

// Configuração do multer para upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        cb(null, `playlist_${timestamp}.m3u`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 100 * 1024 * 1024, // 100MB limit
        files: 1
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/octet-stream' || 
            file.originalname.endsWith('.m3u') || 
            file.originalname.endsWith('.m3u8')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos .m3u e .m3u8 são permitidos'), false);
        }
    }
});


// Função para processar arquivo M3U e dividir em múltiplos JSONs
async function parseM3U(content) {
    const categories = {};
    const lines = content.trim().split('\n');
    let totalChannels = 0;
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('#EXTINF:')) {
            const metadataLine = lines[i].trim();
            const urlLine = (lines[i + 1] || '').trim();
            
            if (!urlLine || !urlLine.startsWith('http')) continue;

            // Extrair metadados
            const logoMatch = metadataLine.match(/tvg-logo="([^"]*)"/);
            const logo = logoMatch ? logoMatch[1] : '';

            const groupMatch = metadataLine.match(/group-title="([^"]*)"/);
            const group = groupMatch ? groupMatch[1] : 'Sem Categoria';

            const nameMatch = metadataLine.match(/,(.*)$/);
            const name = nameMatch ? nameMatch[1].trim() : 'Canal Desconhecido';
            
            
            // Criar ID único para o canal
            const channelId = `${group.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${totalChannels}`;
            
            if (!categories[group]) {
                categories[group] = {
                    name: group,
                    channels: []
                };
            }
            
            categories[group].channels.push({
                id: channelId,
                name: name,
                logo: logo,
                url: urlLine,
                isActive: true
            });
            
            totalChannels++;
        }
    }
    
    // Limpar categorias vazias após filtragem e ordenar canais
    const filteredCategories = {};
    let filteredChannels = 0;
    
    for (const [categoryName, categoryData] of Object.entries(categories)) {
        if (categoryData.channels.length > 0) {
            // Ordenar canais alfabeticamente por nome
            categoryData.channels.sort((a, b) => {
                return a.name.localeCompare(b.name, 'pt-BR', { 
                    sensitivity: 'base',
                    ignorePunctuation: true,
                    numeric: true
                });
            });
            
            filteredCategories[categoryName] = categoryData;
            filteredChannels += categoryData.channels.length;
        } else {
            console.log(`🗑️ Categoria vazia removida: ${categoryName}`);
        }
    }
    
    // Criar metadata principal
    const metadata = {
        lastUpdated: new Date().toISOString(),
        totalChannels: filteredChannels,
        totalCategories: Object.keys(filteredCategories).length,
        version: '2.0',
        lazyLoading: true,
        sorting: {
            enabled: true,
            description: 'Ordenação alfabética ativa para categorias e canais',
            locale: 'pt-BR'
        }
    };
    
    // Salvar metadata principal
    await fs.writeJson(path.join(dataDir, 'metadata.json'), metadata, { spaces: 2 });
    
    // Ordenar categorias alfabeticamente
    const sortedCategories = Object.keys(filteredCategories).sort((a, b) => {
        return a.localeCompare(b, 'pt-BR', { 
            sensitivity: 'base',
            ignorePunctuation: true,
            numeric: true
        });
    });
    
    // Salvar cada categoria em arquivo separado
    const categoryFiles = [];
    for (const categoryName of sortedCategories) {
        const categoryData = filteredCategories[categoryName];
        const fileName = `${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
        const filePath = path.join(dataDir, 'categories', fileName);
        
        // Criar diretório categories se não existir
        await fs.ensureDir(path.join(dataDir, 'categories'));
        
        // Salvar arquivo da categoria
        await fs.writeJson(filePath, {
            name: categoryName,
            channels: categoryData.channels,
            channelCount: categoryData.channels.length
        }, { spaces: 2 });
        
        categoryFiles.push({
            name: categoryName,
            fileName: fileName,
            channelCount: categoryData.channels.length
        });
    }
    
    // Agrupar categorias por tipo baseado no prefixo
    const groupedCategories = {
        canais: [],
        filmes: [],
        series: []
    };
    
    // Classificar cada categoria baseado no prefixo
    for (const category of categoryFiles) {
        const categoryName = category.name.toUpperCase();
        
        // Verificar prefixo da categoria
        if (categoryName.startsWith('CANAIS |') || categoryName.startsWith('CANAIS|')) {
            groupedCategories.canais.push(category);
        } else if (categoryName.startsWith('FILMES |') || categoryName.startsWith('FILMES|')) {
            groupedCategories.filmes.push(category);
        } else if (categoryName.startsWith('SÉRIES |') || categoryName.startsWith('SÉRIES|') || 
                   categoryName.startsWith('SERIES |') || categoryName.startsWith('SERIES|')) {
            groupedCategories.series.push(category);
        } else {
            // Categoria não classificada vai para canais por padrão
            groupedCategories.canais.push(category);
        }
    }
    
    // Ordenar cada grupo alfabeticamente
    groupedCategories.canais.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    groupedCategories.filmes.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    groupedCategories.series.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    
    // Salvar lista de categorias agrupadas
    await fs.writeJson(path.join(dataDir, 'categories_list.json'), {
        categories: categoryFiles,
        totalCategories: categoryFiles.length,
        lastUpdated: metadata.lastUpdated,
        sorted: true
    }, { spaces: 2 });
    
    // Salvar categorias agrupadas por tipo
    await fs.writeJson(path.join(dataDir, 'grouped_categories.json'), {
        canais: {
            name: 'Canais',
            description: 'Canais de TV, rádio e transmissões ao vivo',
            categories: groupedCategories.canais,
            totalCategories: groupedCategories.canais.length,
            totalChannels: groupedCategories.canais.reduce((sum, cat) => sum + cat.channelCount, 0)
        },
        filmes: {
            name: 'Filmes',
            description: 'Filmes, documentários e produções cinematográficas',
            categories: groupedCategories.filmes,
            totalCategories: groupedCategories.filmes.length,
            totalChannels: groupedCategories.filmes.reduce((sum, cat) => sum + cat.channelCount, 0)
        },
        series: {
            name: 'Séries',
            description: 'Séries, novelas e programas de TV',
            categories: groupedCategories.series,
            totalCategories: groupedCategories.series.length,
            totalChannels: groupedCategories.series.reduce((sum, cat) => sum + cat.channelCount, 0)
        },
        lastUpdated: metadata.lastUpdated
    }, { spaces: 2 });
    
    return {
        metadata: metadata,
        categoryFiles: categoryFiles,
        originalStats: {
            totalChannels: totalChannels,
            totalCategories: Object.keys(categories).length
        },
        filteredStats: {
            totalChannels: filteredChannels,
            totalCategories: Object.keys(filteredCategories).length
        }
    };
}

// Rota para upload e processamento da playlist
app.post('/api/upload-playlist', upload.single('playlist'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'Nenhum arquivo foi enviado' 
            });
        }

        console.log(`Processando arquivo: ${req.file.originalname}`);
        
        // Ler conteúdo do arquivo
        const m3uContent = await fs.readFile(req.file.path, 'utf8');
        
        // Processar M3U e dividir em múltiplos arquivos
        const processedData = await parseM3U(m3uContent);
        
        // Criar backup da estrutura antiga (compatibilidade)
        const backupName = `playlist_${Date.now()}.json`;
        const backupPath = path.join(backupDir, backupName);
        
        // Garantir que o diretório backup existe
        await fs.ensureDir(backupDir);
        
        await fs.writeJson(backupPath, {
            metadata: processedData.metadata,
            categories: processedData.categoryFiles
        }, { spaces: 2 });
        
        // Limpar arquivo temporário
        await fs.remove(req.file.path);
        
        console.log(`Playlist processada: ${processedData.filteredStats.totalChannels} canais em ${processedData.filteredStats.totalCategories} categorias`);
        
        res.json({ 
            success: true, 
            message: 'Playlist processada com sucesso',
            stats: {
                totalChannels: processedData.filteredStats.totalChannels,
                totalCategories: processedData.filteredStats.totalCategories,
                lastUpdated: processedData.metadata.lastUpdated,
                lazyLoading: true,
                filesCreated: processedData.categoryFiles.length + 2 // metadata + categories_list + category files
            }
        });
        
    } catch (error) {
        console.error('Erro ao processar playlist:', error);
        
        // Limpar arquivo temporário em caso de erro
        if (req.file) {
            await fs.remove(req.file.path).catch(() => {});
        }
        
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Rota para buscar metadata da playlist
app.get('/api/playlist', async (req, res) => {
    try {
        const metadataPath = path.join(dataDir, 'metadata.json');
        
        if (!await fs.pathExists(metadataPath)) {
            return res.status(404).json({ 
                success: false, 
                error: 'Nenhuma playlist encontrada. Faça upload de um arquivo M3U primeiro.' 
            });
        }
        
        const metadata = await fs.readJson(metadataPath);
        res.json(metadata);
        
    } catch (error) {
        console.error('Erro ao buscar metadata:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor' 
        });
    }
});

// Rota para buscar lista de categorias
app.get('/api/categories', async (req, res) => {
    try {
        const categoriesListPath = path.join(dataDir, 'categories_list.json');
        
        if (!await fs.pathExists(categoriesListPath)) {
            return res.status(404).json({ 
                success: false, 
                error: 'Nenhuma playlist encontrada' 
            });
        }
        
        const categoriesList = await fs.readJson(categoriesListPath);
        res.json({
            success: true,
            categories: categoriesList.categories,
            totalCategories: categoriesList.totalCategories,
            lastUpdated: categoriesList.lastUpdated
        });
        
    } catch (error) {
        console.error('Erro ao buscar categorias:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor' 
        });
    }
});

// Rota para buscar categorias agrupadas por tipo
app.get('/api/grouped-categories', async (req, res) => {
    try {
        const groupedCategoriesPath = path.join(dataDir, 'grouped_categories.json');
        
        if (!await fs.pathExists(groupedCategoriesPath)) {
            return res.status(404).json({ 
                success: false, 
                error: 'Nenhuma playlist encontrada' 
            });
        }
        
        const groupedCategories = await fs.readJson(groupedCategoriesPath);
        res.json({
            success: true,
            ...groupedCategories
        });
        
    } catch (error) {
        console.error('Erro ao buscar categorias agrupadas:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor' 
        });
    }
});

// Rota para buscar categorias de um tipo específico
app.get('/api/categories/:type', async (req, res) => {
    try {
        const { type } = req.params;
        
        if (!['canais', 'filmes', 'series'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Tipo inválido. Use: canais, filmes ou series'
            });
        }
        
        const groupedCategoriesPath = path.join(dataDir, 'grouped_categories.json');
        
        if (!await fs.pathExists(groupedCategoriesPath)) {
            return res.status(404).json({ 
                success: false, 
                error: 'Nenhuma playlist encontrada' 
            });
        }
        
        const groupedCategories = await fs.readJson(groupedCategoriesPath);
        
        if (!groupedCategories[type]) {
            return res.status(404).json({
                success: false,
                error: 'Tipo de categoria não encontrado'
            });
        }
        
        res.json({
            success: true,
            type: type,
            ...groupedCategories[type]
        });
        
    } catch (error) {
        console.error('Erro ao buscar categorias por tipo:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor' 
        });
    }
});

// Rota para buscar canais de uma categoria específica (lazy loading)
app.get('/api/channels/:category', async (req, res) => {
    try {
        const { category } = req.params;
        
        // Converter nome da categoria para nome do arquivo
        const fileName = `${category.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
        const categoryPath = path.join(dataDir, 'categories', fileName);
        
        if (!await fs.pathExists(categoryPath)) {
            return res.status(404).json({ 
                success: false, 
                error: 'Categoria não encontrada' 
            });
        }
        
        const categoryData = await fs.readJson(categoryPath);
        
        res.json({
            success: true,
            category: categoryData.name,
            channels: categoryData.channels,
            channelCount: categoryData.channelCount
        });
        
    } catch (error) {
        console.error('Erro ao buscar canais:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor' 
        });
    }
});


// Rota de status
app.get('/api/status', async (req, res) => {
    try {
        const metadataPath = path.join(dataDir, 'metadata.json');
        const hasPlaylist = await fs.pathExists(metadataPath);
        
        let playlistInfo = null;
        if (hasPlaylist) {
            const metadata = await fs.readJson(metadataPath);
            playlistInfo = {
                lastUpdated: metadata.lastUpdated,
                totalChannels: metadata.totalChannels,
                totalCategories: metadata.totalCategories,
                lazyLoading: metadata.lazyLoading,
                version: metadata.version
            };
        }
        
        res.json({
            success: true,
            server: 'IPTV Player Backend',
            version: '2.0.0',
            hasPlaylist: hasPlaylist,
            playlist: playlistInfo
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: 'Erro interno do servidor' 
        });
    }
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'Arquivo muito grande. Limite de 100MB.'
            });
        }
    }
    
    console.error('Erro não tratado:', error);
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor IPTV rodando na porta ${PORT}`);
    console.log(`📁 Diretório de dados: ${dataDir}`);
    console.log(`📁 Diretório de uploads: ${uploadsDir}`);
    console.log(`📁 Diretório de backup: ${backupDir}`);
    console.log(`🌐 Acesse: http://localhost:${PORT}`);
});
