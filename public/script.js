document.addEventListener('DOMContentLoaded', () => {
    // Elementos DOM
    const m3uUpload = document.getElementById('m3u-upload');
    const uploadBtn = document.getElementById('upload-btn');
    const categoryListElement = document.getElementById('category-list');
    const channelsGridElement = document.getElementById('channels-grid');
    const videoPlayer = document.getElementById('videoPlayer');
    const playerContainer = document.getElementById('player-container');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResultsCount = document.getElementById('search-results-count');
    const backToChannelsBtn = document.getElementById('back-to-channels');
    const backToMainBtn = document.getElementById('back-to-main');
    const mainPage = document.getElementById('main-page');
    const categoryPage = document.getElementById('category-page');
    const sidebar = document.getElementById('sidebar');
    
    // Variáveis globais
    let hls = null;
    let channelData = {};
    let currentPlaylist = null;
    let allChannels = [];
    let filteredChannels = [];
    let currentCategory = null;
    let currentCategoryType = null;
    let observer = null;
    let currentPage = 0;
    const ITEMS_PER_PAGE = 20;
    
    // Sistema de rotas
    let currentRoute = 'main';
    let seriesData = {}; // Cache para dados das séries
    let currentSeriesCategory = null; // Categoria de séries atual

    // Funções de rota
    function navigateTo(route, params = {}) {
        console.log('Navegando para:', route, params);
        
        // Atualizar URL sem recarregar a página
        let url = '/';
        if (route === 'main') {
            url = '/';
        } else if (route === 'series-episodes') {
            const seriesName = encodeURIComponent(params.seriesName);
            url = `/series/${seriesName}`;
        } else {
            url = `/${route}`;
        }
        
        window.history.pushState({ route, params }, '', url);
        currentRoute = route;
        handleRoute(route, params);
        
        // Ajustar estado da busca baseado na rota
        updateSearchState(route);
    }
    
    function handleRoute(route, params = {}) {
        console.log('Processando rota:', route, params);
        
        switch (route) {
            case 'main':
                showMainPage();
                break;
            case 'series':
                showSeriesPage();
                break;
            case 'series-episodes':
                displaySeriesEpisodes(params.seriesName);
                break;
            case 'canais':
                showCanaisPage();
                break;
            case 'filmes':
                showFilmesPage();
                break;
            default:
                showMainPage();
        }
    }
    
    // Configurar listener para mudanças de URL
    window.addEventListener('popstate', (event) => {
        if (event.state) {
            currentRoute = event.state.route;
            handleRoute(event.state.route, event.state.params || {});
            updateSearchState(event.state.route);
        } else {
            // URL direta acessada
            const path = window.location.pathname.substring(1);
            if (path === '' || path === 'main') {
                handleRoute('main');
            } else if (path === 'series') {
                handleRoute('series');
            } else if (path.startsWith('series/')) {
                const seriesName = decodeURIComponent(path.substring(7));
                handleRoute('series-episodes', { seriesName });
            } else {
                handleRoute('main');
            }
            updateSearchState(currentRoute);
        }
    });
    
    // Função para atualizar estado da busca
    function updateSearchState(route) {
        const searchContainer = document.querySelector('.search-container');
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        
        if (route === 'main') {
            // Tela inicial: desabilitar busca
            searchContainer.classList.add('disabled');
            searchInput.disabled = true;
            searchBtn.disabled = true;
            searchInput.placeholder = 'Busca disponível após selecionar uma categoria';
            searchInput.value = '';
            hideSearchResultsCount();
        } else {
            // Categorias: habilitar busca
            searchContainer.classList.remove('disabled');
            searchInput.disabled = false;
            searchBtn.disabled = false;
            
            // Definir placeholder baseado na categoria
            if (route === 'series' || route === 'series-episodes') {
                searchInput.placeholder = 'Buscar séries... (mín. 3 caracteres)';
            } else if (route === 'canais') {
                searchInput.placeholder = 'Buscar canais... (mín. 3 caracteres)';
            } else if (route === 'filmes') {
                searchInput.placeholder = 'Buscar filmes... (mín. 3 caracteres)';
            } else {
                searchInput.placeholder = 'Buscar... (mín. 3 caracteres)';
            }
        }
    }
    
    // Função para mostrar contador de resultados da busca
    function showSearchResultsCount(filteredCount, totalCount, searchTerm, contentType = 'itens') {
        if (searchResultsCount) {
            if (searchTerm && searchTerm.length >= 3) {
                searchResultsCount.textContent = `${filteredCount} de ${totalCount} ${contentType} encontrados para "${searchTerm}"`;
                searchResultsCount.style.display = 'block';
            } else {
                searchResultsCount.textContent = `${totalCount} ${contentType} disponíveis`;
                searchResultsCount.style.display = 'block';
            }
        }
    }
    
    // Função para ocultar contador de resultados da busca
    function hideSearchResultsCount() {
        if (searchResultsCount) {
            searchResultsCount.style.display = 'none';
        }
    }

    // Inicialização
    console.log('Iniciando aplicação com sistema de rotas...');
    console.log('Elementos DOM encontrados:', {
        mainPage: !!mainPage,
        categoryPage: !!categoryPage,
        sidebar: !!sidebar
    });
    
        // Configurar estado inicial
    mainPage.style.display = 'flex';
    categoryPage.style.display = 'none';
    sidebar.style.display = 'none';
    
        // Processar rota inicial
        const initialPath = window.location.pathname.substring(1);
        if (initialPath === '' || initialPath === 'main') {
            handleRoute('main');
        } else if (initialPath === 'series') {
            handleRoute('series');
        } else if (initialPath === 'canais') {
            handleRoute('canais');
        } else if (initialPath === 'filmes') {
            handleRoute('filmes');
        } else if (initialPath.startsWith('series/')) {
            const seriesName = decodeURIComponent(initialPath.substring(7));
            handleRoute('series-episodes', { seriesName });
        } else {
            handleRoute('main');
        }
        
        // Configurar estado inicial da busca
        updateSearchState(currentRoute);
    
    loadGroupedCategories();
    setupEventListeners();

    function setupEventListeners() {
        // Upload
        uploadBtn.addEventListener('click', () => m3uUpload.click());
        m3uUpload.addEventListener('change', handleFileUpload);
        
        
        // Busca
        searchInput.addEventListener('input', handleSearch);
        searchBtn.addEventListener('click', performSearch);
        
        // Permitir busca com Enter
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
        
        // Player
        videoPlayer.addEventListener('error', handleVideoError);
        
        // Botão voltar aos canais
        backToChannelsBtn.addEventListener('click', backToChannels);
        
        // Botão voltar à página principal
        backToMainBtn.addEventListener('click', () => navigateTo('main'));
        
        // Cards principais
        document.getElementById('canais-card').addEventListener('click', () => navigateTo('canais'));
        document.getElementById('filmes-card').addEventListener('click', () => navigateTo('filmes'));
        document.getElementById('series-card').addEventListener('click', () => navigateTo('series'));
        
        // Clique na área de conteúdo para desselecionar categoria
        document.querySelector('.content-area').addEventListener('click', (event) => {
            // Se clicou na área de conteúdo (não em cards ou player)
            if (event.target.classList.contains('content-area')) {
                // Desselecionar categoria ativa
                document.querySelectorAll('.category-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Mostrar placeholder se não há categoria
                showPlaceholderIfNoCategory();
                
                // Limpar busca
                searchInput.value = '';
            }
        });
        
        // Inicializar IntersectionObserver
        initializeIntersectionObserver();
    }

    function initializeIntersectionObserver() {
        // Limpar observer anterior se existir
        if (observer) {
            observer.disconnect();
        }
        
        // Configurar IntersectionObserver
        observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    console.log('Sentinela detectada, carregando mais itens...');
                    
                    // Chamar função apropriada baseada no tipo de categoria
                    if (currentCategoryType === 'series' && currentCategory === 'TODOS') {
                        loadMoreSeries();
                    } else {
                        loadMoreChannels();
                    }
                }
            });
        }, {
            root: null,
            rootMargin: '100px',
            threshold: 0.1
        });
        
        console.log('IntersectionObserver inicializado');
    }

    async function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        await uploadToServer(file);
    }

    async function uploadToServer(file) {
        try {
            showLoading('Enviando e processando arquivo...');
            
            const formData = new FormData();
            formData.append('playlist', file);
            
            const response = await fetch('/api/upload-playlist', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                hideLoading();
                showMessage(
                    `✅ Playlist processada com sucesso! ${result.stats.totalChannels} canais em ${result.stats.totalCategories} categorias`, 
                    'success'
                );
                
                await loadGroupedCategories();
                m3uUpload.value = '';
            } else {
                hideLoading();
                console.error('Erro ao processar playlist:', result.error);
            }
        } catch (error) {
            hideLoading();
            console.error('Erro ao enviar arquivo:', error);
            
            let errorMessage = '❌ Erro ao enviar arquivo: ';
            
            if (error.message.includes('Failed to fetch')) {
                errorMessage += 'Servidor não está rodando. Execute "npm start" no terminal.';
            } else if (error.message.includes('NetworkError')) {
                errorMessage += 'Erro de rede. Verifique sua conexão.';
            } else {
                errorMessage += error.message;
            }
            
            console.error('Erro ao enviar arquivo:', error);
        }
    }

    async function loadGroupedCategories() {
        try {
            console.log('Iniciando carregamento das categorias agrupadas...');
            showLoading('Carregando categorias...');
            
            const response = await fetch('/api/grouped-categories');
            console.log('Resposta da API:', response.status, response.ok);
            
            if (!response.ok) {
                throw new Error('Erro ao carregar dados do servidor');
            }
            
            const data = await response.json();
            console.log('Dados recebidos da API:', data);
            
            // Verificar se os dados existem (mesmo sem success)
            if (data.canais && data.filmes && data.series) {
                console.log('Dados válidos, exibindo cards...');
                displayMainCards(data);
                hideLoading();
                console.log('Cards exibidos com sucesso');
            } else {
                console.error('Estrutura de dados incorreta:', data);
                throw new Error('Estrutura de dados incorreta');
            }
        } catch (error) {
            hideLoading();
            console.error('Erro ao carregar categorias agrupadas:', error);
            
            // Fallback: exibir cards com dados padrão
            console.log('Exibindo cards com dados padrão...');
            const fallbackData = {
                canais: {
                    totalCategories: 0,
                    totalChannels: 0
                },
                filmes: {
                    totalCategories: 0,
                    totalChannels: 0
                },
                series: {
                    totalCategories: 0,
                    totalChannels: 0
                }
            };
            displayMainCards(fallbackData);
            
            console.error('Erro ao carregar dados. Faça upload de um arquivo M3U.');
        }
    }

    function displayMainCards(data) {
        console.log('Exibindo cards principais com dados:', data);
        
        // Verificar se os elementos existem
        const canaisStats = document.getElementById('canais-stats');
        const filmesStats = document.getElementById('filmes-stats');
        const seriesStats = document.getElementById('series-stats');
        
        console.log('Elementos encontrados:', {
            canaisStats: !!canaisStats,
            filmesStats: !!filmesStats,
            seriesStats: !!seriesStats
        });
        
        if (canaisStats) {
            canaisStats.innerHTML = `
                <i class="fas fa-folder"></i>
                ${data.canais.totalCategories} categorias • ${data.canais.totalChannels} canais
            `;
            console.log('Estatísticas de canais atualizadas');
        }
        
        if (filmesStats) {
            filmesStats.innerHTML = `
                <i class="fas fa-film"></i>
                ${data.filmes.totalCategories} categorias • ${data.filmes.totalChannels} filmes
            `;
            console.log('Estatísticas de filmes atualizadas');
        }
        
        if (seriesStats) {
            seriesStats.innerHTML = `
                <i class="fas fa-play-circle"></i>
                ${data.series.totalCategories} categorias • ${data.series.totalChannels} séries
            `;
            console.log('Estatísticas de séries atualizadas');
        }
        
        console.log('Cards principais exibidos com sucesso');
    }

    // Funções de página
    function showMainPage() {
        console.log('Mostrando página principal');
        mainPage.style.display = 'flex';
        categoryPage.style.display = 'none';
        sidebar.style.display = 'none';
        
        // Ajustar layout
        const mainLayout = document.querySelector('.main-layout');
        mainLayout.classList.remove('with-sidebar');
        mainLayout.classList.add('without-sidebar');
        
        // Fechar player se estiver aberto
        playerContainer.classList.add('hidden');
        playerContainer.classList.remove('expanded');
        document.querySelector('.player-placeholder').style.display = 'flex';
        document.querySelector('.player-controls').style.display = 'none';
        videoPlayer.style.display = 'none';
        
        // Parar reprodução
        if (hls) {
            hls.destroy();
            hls = null;
        }
        videoPlayer.src = '';
        
        // Limpar estado
        currentCategoryType = null;
        currentCategory = null;
        allChannels = [];
        filteredChannels = [];
        
        // Limpar observer
        clearObserver();
        
        // Limpar busca
        searchInput.value = '';
        
        // Recarregar cards principais
        loadGroupedCategories();
    }

    function showSeriesPage() {
        console.log('Mostrando página de séries');
        currentCategoryType = 'series';
        
        // Limpar dados da categoria anterior
        allChannels = [];
        filteredChannels = [];
        currentCategory = null;
        currentSeriesCategory = null;
        seriesData = {};
        
        // Ocultar página principal e mostrar página de categoria
        mainPage.style.display = 'none';
        categoryPage.style.display = 'flex';
        sidebar.style.display = 'flex';
        
        // Ajustar layout para mostrar sidebar
        const mainLayout = document.querySelector('.main-layout');
        mainLayout.classList.remove('without-sidebar');
        mainLayout.classList.add('with-sidebar');
        
        // Atualizar título da página
        document.getElementById('category-page-title').textContent = 'Séries';
        
        // Fechar player se estiver aberto
        playerContainer.classList.add('hidden');
        playerContainer.classList.remove('expanded');
        document.querySelector('.player-placeholder').style.display = 'flex';
        document.querySelector('.player-controls').style.display = 'none';
        videoPlayer.style.display = 'none';
        
        // Parar reprodução
        if (hls) {
            hls.destroy();
            hls = null;
        }
        videoPlayer.src = '';
        
        // Limpar grid e contador
        channelsGridElement.innerHTML = '';
        hideSearchResultsCount();
        
        // Limpar observer
        clearObserver();
        
        // Carregar categorias de séries
        loadCategoryType('series');
    }


    function showCanaisPage() {
        console.log('Mostrando página de canais');
        
        // Limpar dados da categoria anterior
        allChannels = [];
        filteredChannels = [];
        currentCategory = null;
        currentSeriesCategory = null;
        seriesData = {};
        
        // Fechar player se estiver aberto
        playerContainer.classList.add('hidden');
        playerContainer.classList.remove('expanded');
        channelsGridElement.classList.add('active');
        channelsGridElement.classList.add('full-height');
        
        // Ocultar player e controles
        document.querySelector('.player-placeholder').style.display = 'none';
        document.querySelector('.player-controls').style.display = 'none';
        videoPlayer.style.display = 'none';
        
        // Parar reprodução
        if (hls) {
            hls.destroy();
            hls = null;
        }
        videoPlayer.src = '';
        
        // Mostrar página de categorias
        mainPage.style.display = 'none';
        categoryPage.style.display = 'flex';
        sidebar.style.display = 'flex';
        
        // Ajustar layout para mostrar sidebar
        const mainLayout = document.querySelector('.main-layout');
        mainLayout.classList.remove('without-sidebar');
        mainLayout.classList.add('with-sidebar');
        
        // Atualizar título da página
        document.getElementById('category-page-title').textContent = 'Canais';
        
        // Configurar tipo de categoria
        currentCategoryType = 'canais';
        
        // Limpar grid e contador
        channelsGridElement.innerHTML = '';
        hideSearchResultsCount();
        
        // Limpar observer
        clearObserver();
        
        // Carregar categorias de canais
        loadCategoryType('canais');
    }

    function showFilmesPage() {
        console.log('Mostrando página de filmes');
        
        // Limpar dados da categoria anterior
        allChannels = [];
        filteredChannels = [];
        currentCategory = null;
        currentSeriesCategory = null;
        seriesData = {};
        
        // Fechar player se estiver aberto
        playerContainer.classList.add('hidden');
        playerContainer.classList.remove('expanded');
        channelsGridElement.classList.add('active');
        channelsGridElement.classList.add('full-height');
        
        // Ocultar player e controles
        document.querySelector('.player-placeholder').style.display = 'none';
        document.querySelector('.player-controls').style.display = 'none';
        videoPlayer.style.display = 'none';
        
        // Parar reprodução
        if (hls) {
            hls.destroy();
            hls = null;
        }
        videoPlayer.src = '';
        
        // Mostrar página de categorias
        mainPage.style.display = 'none';
        categoryPage.style.display = 'flex';
        sidebar.style.display = 'flex';
        
        // Ajustar layout para mostrar sidebar
        const mainLayout = document.querySelector('.main-layout');
        mainLayout.classList.remove('without-sidebar');
        mainLayout.classList.add('with-sidebar');
        
        // Atualizar título da página
        document.getElementById('category-page-title').textContent = 'Filmes';
        
        // Configurar tipo de categoria
        currentCategoryType = 'filmes';
        
        // Limpar grid e contador
        channelsGridElement.innerHTML = '';
        hideSearchResultsCount();
        
        // Limpar observer
        clearObserver();
        
        // Carregar categorias de filmes
        loadCategoryType('filmes');
    }

    function openCategoryType(type) {
        // Salvar estado atual antes de navegar
        pushNavigationState('category-type', { type: type });
        
        currentCategoryType = type;
        
        // Ocultar página principal e mostrar página de categoria
        mainPage.style.display = 'none';
        categoryPage.style.display = 'flex';
        sidebar.style.display = 'flex';
        
        // Ajustar layout para mostrar sidebar
        const mainLayout = document.querySelector('.main-layout');
        mainLayout.classList.remove('without-sidebar');
        mainLayout.classList.add('with-sidebar');
        
        // Atualizar título da página
        const typeNames = {
            'canais': 'Canais',
            'filmes': 'Filmes',
            'series': 'Séries'
        };
        document.getElementById('category-page-title').textContent = typeNames[type];
        
        // Carregar categorias do tipo selecionado
        loadCategoryType(type);
    }

    async function loadCategoryType(type) {
        try {
            showLoading('Carregando categorias...');
            
            const response = await fetch(`/api/categories/${type}`);
            
            if (!response.ok) {
                throw new Error('Erro ao carregar categorias');
            }
            
            const data = await response.json();
            
            // Verificar se os dados existem (mesmo sem success)
            if (data.categories) {
                displayCategories(data.categories);
                hideLoading();
            } else {
                console.error('Estrutura de dados incorreta:', data);
                throw new Error('Estrutura de dados incorreta');
            }
        } catch (error) {
            hideLoading();
            console.error('Erro ao carregar categorias:', error);
        }
    }


    function displayCategories(categories) {
        console.log('Categorias recebidas:', categories);
        categoryListElement.innerHTML = '';
        
        if (!categories || categories.length === 0) {
            categoryListElement.innerHTML = '<div class="loading">Nenhuma categoria encontrada</div>';
            return;
        }
        
        // Calcular total de canais para a categoria "TODOS"
        const totalChannels = categories.reduce((sum, category) => sum + category.channelCount, 0);
        
        // Adicionar categoria "TODOS" no início
        const allCategoryItem = document.createElement('div');
        allCategoryItem.className = 'category-item all-category';
        allCategoryItem.innerHTML = `
            <i class="fas fa-globe category-icon"></i>
            <span class="category-name">TODOS</span>
            <span class="category-count">${totalChannels}</span>
        `;
        
        allCategoryItem.addEventListener('click', (event) => loadAllCategoryChannels(event.currentTarget));
        categoryListElement.appendChild(allCategoryItem);
        
        // Adicionar as outras categorias
        categories.forEach(category => {
            // Remover prefixos como "FILMES |", "CANAI |", "SÉRIES |" do nome
            let cleanName = category.name;
            
            // Remover prefixos comuns
            const prefixes = [
                /^FILMES\s*\|\s*/i,
                /^CANAIS\s*\|\s*/i,
                /^CANAI\s*\|\s*/i,
                /^SÉRIES\s*\|\s*/i,
                /^SERIES\s*\|\s*/i,
                /^TV\s*\|\s*/i,
                /^CHANNELS\s*\|\s*/i
            ];
            
            prefixes.forEach(prefix => {
                cleanName = cleanName.replace(prefix, '');
            });
            
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <i class="fas fa-folder category-icon"></i>
                <span class="category-name">${cleanName}</span>
                <span class="category-count">${category.channelCount}</span>
            `;
            
            categoryItem.addEventListener('click', (event) => loadCategoryChannels(category.name, event.currentTarget));
            categoryListElement.appendChild(categoryItem);
        });
        
        console.log(`${categories.length + 1} categorias exibidas (incluindo TODOS)`);
    }

    async function loadAllCategoryChannels(clickedElement = null) {
        try {
            console.log('Carregando todos os canais da categoria:', currentCategoryType);
            
            // Atualizar categoria ativa
            document.querySelectorAll('.category-item').forEach(item => {
                item.classList.remove('active');
            });
            
            if (clickedElement) {
                clickedElement.classList.add('active');
            }
            
            showLoading('Carregando todos os canais...');
            currentCategory = 'TODOS';
            
            // Se for categoria de séries, armazenar para voltar depois
            if (currentCategoryType === 'series') {
                currentSeriesCategory = 'TODOS';
            }
            
            const response = await fetch(`/api/all-channels/${currentCategoryType}`);
            
            if (!response.ok) {
                throw new Error('Erro ao carregar todos os canais');
            }
            
            const data = await response.json();
            console.log('Dados de todos os canais recebidos:', data);
            
            // Verificar se os dados existem
            if (data.channels) {
                allChannels = data.channels;
                filteredChannels = [...allChannels];
                displayChannels(data.channels);
                hideLoading();
            } else {
                console.error('Estrutura de dados incorreta:', data);
                throw new Error('Estrutura de dados incorreta');
            }
        } catch (error) {
            hideLoading();
            console.error('Erro ao carregar todos os canais:', error);
        }
    }

    async function loadCategoryChannels(categoryName, clickedElement = null) {
        try {
            console.log('Carregando canais para categoria:', categoryName);
            
            // Atualizar categoria ativa
            document.querySelectorAll('.category-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Encontrar e ativar o item clicado
            if (clickedElement) {
                clickedElement.classList.add('active');
            } else {
                // Fallback: encontrar por nome da categoria
                const categoryItems = document.querySelectorAll('.category-item');
                categoryItems.forEach(item => {
                    const nameElement = item.querySelector('.category-name');
                    if (nameElement && nameElement.textContent === categoryName) {
                        item.classList.add('active');
                    }
                });
            }
            
            showLoading('Carregando canais...');
            currentCategory = categoryName;
            
            // Se for categoria de séries, armazenar para voltar depois
            if (currentCategoryType === 'series') {
                currentSeriesCategory = categoryName;
            }
            
            const response = await fetch(`/api/channels/${encodeURIComponent(categoryName)}`);
            
            if (!response.ok) {
                throw new Error('Erro ao carregar canais');
            }
            
            const data = await response.json();
            console.log('Dados dos canais recebidos:', data);
            
            // Verificar se os dados existem (mesmo sem success)
            if (data.channels) {
                allChannels = data.channels;
                filteredChannels = [...allChannels];
                displayChannels(data.channels);
                hideLoading();
            } else {
                console.error('Estrutura de dados incorreta:', data);
                throw new Error('Estrutura de dados incorreta');
            }
        } catch (error) {
            hideLoading();
            console.error('Erro ao carregar canais da categoria:', error);
        }
    }

    function displayChannels(channels) {
        console.log('Exibindo canais:', channels);
        channelsGridElement.classList.add('active');
        channelsGridElement.classList.add('full-height');
        channelsGridElement.innerHTML = '';
        
        // Ocultar player quando categoria é selecionada
        playerContainer.classList.add('hidden');
        playerContainer.classList.remove('expanded');
        
        if (!channels || channels.length === 0) {
            channelsGridElement.innerHTML = '<div class="loading">Nenhum canal encontrado</div>';
            return;
        }
        
        // Garantir que filteredChannels está definida
        // Só atualizar allChannels se estivermos carregando uma nova categoria (não uma busca)
        const isSearchActive = searchInput.value.trim().length >= 3;
        if (!isSearchActive) {
            allChannels = channels;
        }
        filteredChannels = [...channels];
        
        // Mostrar contador de resultados
        let contentType = 'itens';
        let filteredCount = filteredChannels.length;
        let totalCount = allChannels.length;
        
        if (currentRoute === 'canais') {
            contentType = 'canais';
        } else if (currentRoute === 'filmes') {
            contentType = 'filmes';
        } else if (currentRoute === 'series') {
            contentType = 'séries';
            // Para séries, contar séries únicas em vez de episódios
            const seriesGroups = {};
            filteredChannels.forEach(channel => {
                const seriesMatch = channel.name.match(/^(.+?)\s*[-\s]*S\d+E\d+/);
                if (seriesMatch) {
                    const seriesName = seriesMatch[1].trim();
                    seriesGroups[seriesName] = true;
                }
            });
            filteredCount = Object.keys(seriesGroups).length;
            
            // Contar total de séries únicas
            const totalSeriesGroups = {};
            allChannels.forEach(channel => {
                const seriesMatch = channel.name.match(/^(.+?)\s*[-\s]*S\d+E\d+/);
                if (seriesMatch) {
                    const seriesName = seriesMatch[1].trim();
                    totalSeriesGroups[seriesName] = true;
                }
            });
            totalCount = Object.keys(totalSeriesGroups).length;
        }
        
        showSearchResultsCount(filteredCount, totalCount, searchInput.value.trim(), contentType);
        
        console.log(`Total de canais: ${allChannels.length}, Canais filtrados: ${filteredChannels.length}`);
        
        // Se estamos na categoria de séries, agrupar por série
        if (currentCategoryType === 'series') {
            displaySeriesGroups(channels);
        } else {
            // Resetar paginação
            currentPage = 0;
            
            // Reinicializar observer para nova lista
            initializeIntersectionObserver();
            
            // Carregar primeira página
            loadMoreChannels();
        }
    }

    function displaySeriesGroupsWithSearch(channels, searchTerm) {
        console.log('Agrupando séries com busca...');
        console.log('Canais recebidos:', channels.length);
        console.log('Termo de busca:', searchTerm);
        
        // Agrupar episódios por série
        const seriesGroups = {};
        
        channels.forEach(channel => {
            // Extrair nome da série do formato "Nome da Série SXXEYY" ou "Nome da Série - SXXEYY"
            const seriesMatch = channel.name.match(/^(.+?)\s*[-\s]*S\d+E\d+/);
            if (seriesMatch) {
                const seriesName = seriesMatch[1].trim();
                
                // Debug: mostrar primeiros 5 matches
                if (Object.keys(seriesGroups).length < 5) {
                    console.log(`Match encontrado: "${channel.name}" -> "${seriesName}"`);
                }
                
                if (!seriesGroups[seriesName]) {
                    seriesGroups[seriesName] = {
                        name: seriesName,
                        episodes: [],
                        logo: channel.logo, // Usar logo do primeiro episódio
                        totalEpisodes: 0
                    };
                }
                
                seriesGroups[seriesName].episodes.push(channel);
                seriesGroups[seriesName].totalEpisodes++;
            } else {
                // Debug: mostrar alguns que não fizeram match
                if (Object.keys(seriesGroups).length < 5) {
                    console.log(`SEM MATCH: "${channel.name}"`);
                }
            }
        });
        
        console.log(`Encontradas ${Object.keys(seriesGroups).length} séries únicas antes do filtro`);
        
        // Filtrar grupos de séries pelo termo de busca
        const filteredSeriesGroups = {};
        Object.keys(seriesGroups).forEach(seriesName => {
            if (seriesName.toLowerCase().includes(searchTerm.toLowerCase())) {
                filteredSeriesGroups[seriesName] = seriesGroups[seriesName];
            }
        });
        
        const seriesFound = Object.keys(filteredSeriesGroups).length;
        console.log(`Encontradas ${seriesFound} séries únicas após filtro`);
        
        // Atualizar contador com número de séries encontradas
        showSearchResultsCount(seriesFound, Object.keys(seriesGroups).length, searchTerm, 'séries');
        
        // Salvar dados das séries filtradas no cache
        seriesData = filteredSeriesGroups;
        
        // Converter para array e ordenar por nome
        const seriesArray = Object.values(filteredSeriesGroups).sort((a, b) => 
            a.name.localeCompare(b.name, 'pt-BR')
        );
        
        // Exibir todas as séries filtradas de uma vez
        channelsGridElement.classList.add('active');
        channelsGridElement.classList.add('full-height');
        channelsGridElement.innerHTML = '';
        
        seriesArray.forEach((series, index) => {
            const seriesCard = document.createElement('div');
            seriesCard.className = 'channel-card fade-in';
            seriesCard.innerHTML = `
                <div class="channel-poster">
                    ${series.logo ? 
                        `<img src="${series.logo}" alt="${series.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                    }
                    <div class="default-icon" style="display: ${series.logo ? 'none' : 'flex'};">
                        <i class="fas fa-play-circle"></i>
                    </div>
                    <div class="play-overlay">
                        <i class="fas fa-list play-icon"></i>
                    </div>
                </div>
                <div class="channel-info">
                    <h3 class="channel-name">${series.name}</h3>
                    <div class="series-info">
                        <span class="episode-count">${series.totalEpisodes} episódios</span>
                    </div>
                </div>
            `;
            
            seriesCard.addEventListener('click', () => {
                currentSeriesCategory = series.name;
                displaySeriesEpisodes(series.name);
            });
            
            channelsGridElement.appendChild(seriesCard);
        });
        
        console.log(`Exibidas ${seriesArray.length} séries (todas de uma vez com filtro)`);
    }

    function displaySeriesGroups(channels) {
        console.log('Agrupando séries...');
        
        // Agrupar episódios por série
        const seriesGroups = {};
        
        channels.forEach(channel => {
            // Extrair nome da série do formato "Nome da Série SXXEYY" ou "Nome da Série - SXXEYY"
            const seriesMatch = channel.name.match(/^(.+?)\s*[-\s]*S\d+E\d+/);
            if (seriesMatch) {
                const seriesName = seriesMatch[1].trim();
                
                if (!seriesGroups[seriesName]) {
                    seriesGroups[seriesName] = {
                        name: seriesName,
                        episodes: [],
                        logo: channel.logo, // Usar logo do primeiro episódio
                        totalEpisodes: 0
                    };
                }
                
                seriesGroups[seriesName].episodes.push(channel);
                seriesGroups[seriesName].totalEpisodes++;
            }
        });
        
        console.log(`Encontradas ${Object.keys(seriesGroups).length} séries únicas`);
        
        // Salvar dados das séries no cache
        seriesData = seriesGroups;
        
        // Converter para array e ordenar por nome
        const seriesArray = Object.values(seriesGroups).sort((a, b) => 
            a.name.localeCompare(b.name, 'pt-BR')
        );
        
        // Se estamos na categoria "TODOS" e não há busca ativa, usar paginação
        const isSearchActive = searchInput.value.trim().length >= 3;
        if (currentCategory === 'TODOS' && !isSearchActive) {
            console.log('Categoria TODOS detectada, usando paginação para séries');
            
            // Configurar dados para paginação
            allChannels = seriesArray; // Usar séries como "canais" para paginação
            filteredChannels = [...seriesArray];
            
            // Resetar paginação
            currentPage = 0;
            
            // Reinicializar observer para nova lista
            initializeIntersectionObserver();
            
            // Carregar primeira página
            loadMoreSeries();
        } else {
            // Para categorias específicas, exibir todas as séries de uma vez (comportamento original)
            channelsGridElement.classList.add('active');
            channelsGridElement.classList.add('full-height');
            channelsGridElement.innerHTML = '';
            
            seriesArray.forEach((series, index) => {
                const seriesCard = document.createElement('div');
                seriesCard.className = 'channel-card fade-in';
                seriesCard.innerHTML = `
                    <div class="channel-poster">
                        ${series.logo ? 
                            `<img src="${series.logo}" alt="${series.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                            ''
                        }
                        <div class="default-icon" style="display: ${series.logo ? 'none' : 'flex'};">
                            <i class="fas fa-play-circle"></i>
                        </div>
                        <div class="play-overlay">
                            <i class="fas fa-list play-icon"></i>
                        </div>
                    </div>
                    <div class="channel-info">
                        <h3 class="channel-name">${series.name}</h3>
                        <div class="series-info">
                            <span class="episode-count">${series.totalEpisodes} episódios</span>
                        </div>
                    </div>
                `;
                
                seriesCard.addEventListener('click', () => {
                    navigateTo('series-episodes', { seriesName: series.name });
                });
                channelsGridElement.appendChild(seriesCard);
            });
            
            console.log(`Exibidas ${seriesArray.length} séries (todas de uma vez)`);
        }
    }

    function displaySeriesEpisodes(seriesName) {
        console.log(`Exibindo episódios da série: ${seriesName}`);
        
        // Verificar se temos os dados da série no cache
        if (!seriesData[seriesName]) {
            console.error('Série não encontrada no cache:', seriesName);
            navigateTo('series');
            return;
        }
        
        const series = seriesData[seriesName];
        
        // Fechar player se estiver aberto
        playerContainer.classList.add('hidden');
        playerContainer.classList.remove('expanded');
        document.querySelector('.player-placeholder').style.display = 'flex';
        document.querySelector('.player-controls').style.display = 'none';
        videoPlayer.style.display = 'none';
        
        // Parar reprodução
        if (hls) {
            hls.destroy();
            hls = null;
        }
        videoPlayer.src = '';
        
        // Limpar grid e exibir episódios
        channelsGridElement.innerHTML = '';
        
        // Adicionar header da série
        const seriesHeader = document.createElement('div');
        seriesHeader.className = 'series-header';
        seriesHeader.innerHTML = `
            <div class="series-header-content">
                <button class="btn btn-secondary" onclick="backToSeries()">
                    <i class="fas fa-arrow-left"></i>
                    Voltar às Séries
                </button>
                <h2 class="series-title">${series.name}</h2>
                <span class="series-episode-count">${series.totalEpisodes} episódios</span>
            </div>
        `;
        channelsGridElement.appendChild(seriesHeader);
        
        // Ordenar episódios por temporada e episódio
        const sortedEpisodes = series.episodes.sort((a, b) => {
            const aMatch = a.name.match(/S(\d+)E(\d+)/);
            const bMatch = b.name.match(/S(\d+)E(\d+)/);
            
            if (aMatch && bMatch) {
                const aSeason = parseInt(aMatch[1]);
                const bSeason = parseInt(bMatch[1]);
                const aEpisode = parseInt(aMatch[2]);
                const bEpisode = parseInt(bMatch[2]);
                
                if (aSeason !== bSeason) {
                    return aSeason - bSeason;
                }
                return aEpisode - bEpisode;
            }
            
            return a.name.localeCompare(b.name, 'pt-BR');
        });
        
        // Exibir episódios
        sortedEpisodes.forEach((episode, index) => {
            const episodeCard = document.createElement('div');
            episodeCard.className = 'channel-card fade-in episode-card';
            episodeCard.innerHTML = `
                <div class="channel-poster">
                    ${episode.logo ? 
                        `<img src="${episode.logo}" alt="${episode.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                    }
                    <div class="default-icon" style="display: ${episode.logo ? 'none' : 'flex'};">
                        <i class="fas fa-play"></i>
                    </div>
                    <div class="play-overlay">
                        <i class="fas fa-play play-icon"></i>
                    </div>
                </div>
                <div class="channel-info">
                    <h3 class="channel-name">${episode.name}</h3>
                </div>
            `;
            
            episodeCard.addEventListener('click', (event) => playChannel(episode, event.currentTarget));
            channelsGridElement.appendChild(episodeCard);
        });
        
        console.log(`Exibidos ${sortedEpisodes.length} episódios da série ${series.name}`);
    }


    function loadMoreChannels() {
        console.log('Carregando mais canais, página:', currentPage);
        const startIndex = currentPage * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const channelsToLoad = filteredChannels.slice(startIndex, endIndex);
        
        console.log(`Carregando canais ${startIndex} a ${endIndex} de ${filteredChannels.length}`);
        
        if (channelsToLoad.length === 0) {
            console.log('Não há mais canais para carregar');
            // Não há mais canais para carregar
            if (observer) {
                observer.disconnect();
            }
            return;
        }
        
        // Criar cards para os canais da página atual
        channelsToLoad.forEach((channel, index) => {
            console.log(`Criando card ${index + 1}:`, channel.name);
            
            // Definir ícone baseado no tipo de categoria
            let defaultIcon = 'fas fa-tv'; // padrão para canais
            if (currentCategoryType === 'filmes') {
                defaultIcon = 'fas fa-film';
            } else if (currentCategoryType === 'series') {
                defaultIcon = 'fas fa-play-circle';
            }
            
            const channelCard = document.createElement('div');
            channelCard.className = 'channel-card fade-in';
            channelCard.innerHTML = `
                <div class="channel-poster">
                    ${channel.logo ? 
                        `<img src="${channel.logo}" alt="${channel.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                    }
                    <div class="default-icon" style="display: ${channel.logo ? 'none' : 'flex'};">
                        <i class="${defaultIcon}"></i>
                    </div>
                    <div class="play-overlay">
                        <i class="fas fa-play play-icon"></i>
                    </div>
                </div>
                <div class="channel-info">
                    <h3 class="channel-name">${channel.name}</h3>
                </div>
            `;
            
            channelCard.addEventListener('click', (event) => playChannel(channel, event.currentTarget));
            channelsGridElement.appendChild(channelCard);
        });
        
        console.log(`Adicionados ${channelsToLoad.length} cards ao grid`);
        
        // Incrementar página
        currentPage++;
        
        // Adicionar sentinela se ainda há mais canais
        if (endIndex < filteredChannels.length) {
            addLoadMoreSentinel();
        }
    }
    
    function loadMoreSeries() {
        console.log('Carregando mais séries, página:', currentPage);
        console.log('filteredChannels disponíveis:', filteredChannels.length);
        console.log('Primeiros 3 itens:', filteredChannels.slice(0, 3).map(s => s.name));
        
        const startIndex = currentPage * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const seriesToLoad = filteredChannels.slice(startIndex, endIndex);
        
        console.log(`Carregando séries ${startIndex} a ${endIndex} de ${filteredChannels.length}`);
        
        if (seriesToLoad.length === 0) {
            console.log('Não há mais séries para carregar');
            // Não há mais séries para carregar
            if (observer) {
                observer.disconnect();
            }
            return;
        }
        
        // Criar cards para as séries da página atual
        seriesToLoad.forEach((series, index) => {
            console.log(`Criando card de série ${index + 1}:`, series.name);
            
            const seriesCard = document.createElement('div');
            seriesCard.className = 'channel-card fade-in';
            seriesCard.innerHTML = `
                <div class="channel-poster">
                    ${series.logo ? 
                        `<img src="${series.logo}" alt="${series.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                    }
                    <div class="default-icon" style="display: ${series.logo ? 'none' : 'flex'};">
                        <i class="fas fa-play-circle"></i>
                    </div>
                    <div class="play-overlay">
                        <i class="fas fa-list play-icon"></i>
                    </div>
                </div>
                <div class="channel-info">
                    <h3 class="channel-name">${series.name}</h3>
                    <div class="series-info">
                        <span class="episode-count">${series.totalEpisodes} episódios</span>
                    </div>
                </div>
            `;
            
            seriesCard.addEventListener('click', () => {
                navigateTo('series-episodes', { seriesName: series.name });
            });
            channelsGridElement.appendChild(seriesCard);
        });
        
        console.log(`Adicionados ${seriesToLoad.length} cards de séries ao grid`);
        
        // Incrementar página
        currentPage++;
        
        // Adicionar sentinela se ainda há mais séries
        if (endIndex < filteredChannels.length) {
            addLoadMoreSentinel();
        }
    }

    function addLoadMoreSentinel() {
        // Remover sentinela anterior se existir
        const existingSentinel = document.getElementById('load-more-sentinel');
        if (existingSentinel) {
            if (observer) {
                observer.unobserve(existingSentinel);
            }
            existingSentinel.remove();
        }
        
        // Criar nova sentinela
        const sentinel = document.createElement('div');
        sentinel.id = 'load-more-sentinel';
        sentinel.style.height = '20px';
        sentinel.style.width = '100%';
        sentinel.style.gridColumn = '1 / -1';
        sentinel.style.display = 'flex';
        sentinel.style.alignItems = 'center';
        sentinel.style.justifyContent = 'center';
        
        const loadedCount = Math.min(currentPage * ITEMS_PER_PAGE, filteredChannels.length);
        const totalCount = filteredChannels.length;
        const progress = Math.round((loadedCount / totalCount) * 100);
        
        sentinel.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner"></i> 
                Carregando mais canais... (${loadedCount}/${totalCount} - ${progress}%)
            </div>
        `;
        
        channelsGridElement.appendChild(sentinel);
        
        // Observar a sentinela
        if (observer) {
            observer.observe(sentinel);
            console.log('Sentinela adicionada e sendo observada');
        } else {
            console.warn('Observer não está disponível para observar a sentinela');
        }
    }

    function playChannel(channel, clickedCard = null) {
        // Atualizar card ativo
        document.querySelectorAll('.channel-card').forEach(card => {
            card.classList.remove('active');
        });
        
        if (clickedCard) {
            clickedCard.classList.add('active');
        }
        
        // Mostrar player expandido e ocultar grid de canais
        playerContainer.classList.remove('hidden');
        playerContainer.classList.add('expanded');
        channelsGridElement.classList.remove('active');
        channelsGridElement.classList.remove('full-height');
        
        // Mostrar player e controles
        document.querySelector('.player-placeholder').style.display = 'none';
        document.querySelector('.player-controls').style.display = 'block';
        videoPlayer.style.display = 'block';
        
        // Reproduzir canal
        if (hls) {
            hls.destroy();
        }
        
        const videoUrl = channel.url;
        
        if (videoUrl.includes('.m3u8')) {
             if (Hls.isSupported()) {
                hls = new Hls();
                hls.loadSource(videoUrl);
                hls.attachMedia(videoPlayer);
                hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    videoPlayer.play();
                });
            } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
                videoPlayer.src = videoUrl;
                videoPlayer.play();
            }
        } else {
            videoPlayer.src = videoUrl;
            videoPlayer.play();
        }
    }

    function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase().trim();
        
        // Verificar se a busca está habilitada
        if (event.target.disabled) {
            return;
        }
        
        // Se não há canais carregados, não fazer nada
        if (!allChannels || allChannels.length === 0) {
            return;
        }
        
        // Se busca vazia ou com menos de 3 caracteres, mostrar tudo
        if (searchTerm === '' || searchTerm.length < 3) {
            filteredChannels = [...allChannels];
            let contentType = 'itens';
            let totalCount = allChannels.length;
            
            if (currentRoute === 'canais') {
                contentType = 'canais';
            } else if (currentRoute === 'filmes') {
                contentType = 'filmes';
            } else if (currentRoute === 'series') {
                contentType = 'séries';
                // Para séries, contar séries únicas em vez de episódios
                const totalSeriesGroups = {};
                allChannels.forEach(channel => {
                    const seriesMatch = channel.name.match(/^(.+?)\s*[-\s]*S\d+E\d+/);
                    if (seriesMatch) {
                        const seriesName = seriesMatch[1].trim();
                        totalSeriesGroups[seriesName] = true;
                    }
                });
                totalCount = Object.keys(totalSeriesGroups).length;
            }
            showSearchResultsCount(totalCount, totalCount, searchTerm, contentType);
            console.log('Busca limpa - mostrando todos os itens:', allChannels.length);
        } else {
            // Filtrar apenas os canais da categoria/subcategoria atual
            filteredChannels = allChannels.filter(channel => 
                channel.name.toLowerCase().includes(searchTerm)
            );
            
            // Só atualizar contador se não estivermos em categoria específica de séries
            // (para séries, o contador será atualizado pela função displaySeriesGroupsWithSearch)
            if (!(currentRoute === 'series' && currentCategory !== 'TODOS')) {
                // Determinar tipo de conteúdo para terminologia apropriada
                let contentType = 'itens';
                if (currentRoute === 'canais') {
                    contentType = 'canais';
                } else if (currentRoute === 'filmes') {
                    contentType = 'filmes';
                }
                showSearchResultsCount(filteredChannels.length, allChannels.length, searchTerm, contentType);
            }
            
            console.log(`Busca por "${searchTerm}" - encontrados ${filteredChannels.length} de ${allChannels.length} itens`);
        }
        
        // Desconectar observer anterior se existir
        if (observer) {
            observer.disconnect();
        }
        
        // Exibir resultados filtrados baseado na rota atual
        if (currentRoute === 'series') {
            if (currentCategory === 'TODOS') {
                // Para séries "TODOS", usar paginação com busca
                currentPage = 0;
                
                // Limpar grid antes de mostrar resultados filtrados
                channelsGridElement.innerHTML = '';
                
                // Configurar classes do grid
                channelsGridElement.classList.add('active');
                channelsGridElement.classList.add('full-height');
                
                initializeIntersectionObserver();
                loadMoreSeries();
            } else {
                // Para categoria específica de séries com busca ativa, usar dados originais para agrupar
                const isSearchActive = searchInput.value.trim().length >= 3;
                if (isSearchActive) {
                    // Usar dados originais para agrupar e depois filtrar os grupos
                    displaySeriesGroupsWithSearch(allChannels, searchTerm);
                } else {
                    // Sem busca, usar dados originais normalmente
                    displaySeriesGroups(allChannels);
                }
            }
        } else if (currentRoute === 'series-episodes') {
            // Para episódios de série, manter a estrutura de episódios
            displaySeriesEpisodes(currentSeriesCategory);
        } else if (currentRoute === 'canais' || currentRoute === 'filmes') {
            // Para canais e filmes, usar displayChannels normal
            displayChannels(filteredChannels);
        }
    }
    
    function performSearch() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        // Verificar se a busca está habilitada
        if (searchInput.disabled) {
            return;
        }
        
        // Se não há canais carregados, não fazer nada
        if (!allChannels || allChannels.length === 0) {
            return;
        }
        
        // Se busca vazia ou com menos de 3 caracteres, mostrar tudo
        if (searchTerm === '' || searchTerm.length < 3) {
            filteredChannels = [...allChannels];
            let contentType = 'itens';
            let totalCount = allChannels.length;
            
            if (currentRoute === 'canais') {
                contentType = 'canais';
            } else if (currentRoute === 'filmes') {
                contentType = 'filmes';
            } else if (currentRoute === 'series') {
                contentType = 'séries';
                // Para séries, contar séries únicas em vez de episódios
                const totalSeriesGroups = {};
                allChannels.forEach(channel => {
                    const seriesMatch = channel.name.match(/^(.+?)\s*[-\s]*S\d+E\d+/);
                    if (seriesMatch) {
                        const seriesName = seriesMatch[1].trim();
                        totalSeriesGroups[seriesName] = true;
                    }
                });
                totalCount = Object.keys(totalSeriesGroups).length;
            }
            showSearchResultsCount(totalCount, totalCount, searchTerm, contentType);
        } else {
            // Filtrar apenas os canais da categoria/subcategoria atual
            filteredChannels = allChannels.filter(channel => 
                channel.name.toLowerCase().includes(searchTerm)
            );
            
            // Só atualizar contador se não estivermos em categoria específica de séries
            // (para séries, o contador será atualizado pela função displaySeriesGroupsWithSearch)
            if (!(currentRoute === 'series' && currentCategory !== 'TODOS')) {
                // Determinar tipo de conteúdo para terminologia apropriada
                let contentType = 'itens';
                if (currentRoute === 'canais') {
                    contentType = 'canais';
                } else if (currentRoute === 'filmes') {
                    contentType = 'filmes';
                }
                showSearchResultsCount(filteredChannels.length, allChannels.length, searchTerm, contentType);
            }
        }
        
        // Desconectar observer anterior se existir
        if (observer) {
            observer.disconnect();
        }
        
        // Exibir resultados filtrados baseado na rota atual
        if (currentRoute === 'series') {
            if (currentCategory === 'TODOS') {
                // Para séries "TODOS", usar paginação com busca
                currentPage = 0;
                
                // Limpar grid antes de mostrar resultados filtrados
                channelsGridElement.innerHTML = '';
                
                // Configurar classes do grid
                channelsGridElement.classList.add('active');
                channelsGridElement.classList.add('full-height');
                
                initializeIntersectionObserver();
                loadMoreSeries();
            } else {
                // Para categoria específica de séries com busca ativa, usar dados originais para agrupar
                const isSearchActive = searchInput.value.trim().length >= 3;
                if (isSearchActive) {
                    // Usar dados originais para agrupar e depois filtrar os grupos
                    displaySeriesGroupsWithSearch(allChannels, searchTerm);
                } else {
                    // Sem busca, usar dados originais normalmente
                    displaySeriesGroups(allChannels);
                }
            }
        } else if (currentRoute === 'series-episodes') {
            // Para episódios de série, manter a estrutura de episódios
            displaySeriesEpisodes(currentSeriesCategory);
        } else if (currentRoute === 'canais' || currentRoute === 'filmes') {
            // Para canais e filmes, usar displayChannels normal
            displayChannels(filteredChannels);
        }
    }



    function backToChannels() {
        // Fechar player se estiver aberto
        playerContainer.classList.add('hidden');
        playerContainer.classList.remove('expanded');
        channelsGridElement.classList.add('active');
        channelsGridElement.classList.add('full-height');
        
        // Ocultar player e controles
        document.querySelector('.player-placeholder').style.display = 'none';
        document.querySelector('.player-controls').style.display = 'none';
        videoPlayer.style.display = 'none';
        
        // Parar reprodução
        if (hls) {
            hls.destroy();
            hls = null;
        }
        videoPlayer.src = '';
        
        // Remover card ativo
        document.querySelectorAll('.channel-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Se estamos na rota de episódios, voltar para séries
        if (currentRoute === 'series-episodes') {
            navigateTo('series');
        }
    }

    function backToSeries() {
        // Fechar player se estiver aberto
        playerContainer.classList.add('hidden');
        playerContainer.classList.remove('expanded');
        channelsGridElement.classList.add('active');
        channelsGridElement.classList.add('full-height');
        
        // Ocultar player e controles
        document.querySelector('.player-placeholder').style.display = 'none';
        document.querySelector('.player-controls').style.display = 'none';
        videoPlayer.style.display = 'none';
        
        // Parar reprodução
        if (hls) {
            hls.destroy();
            hls = null;
        }
        videoPlayer.src = '';
        
        // Remover card ativo
        document.querySelectorAll('.channel-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Voltar para a categoria de séries atual
        if (currentSeriesCategory) {
            loadCategoryChannels(currentSeriesCategory);
        } else {
            // Fallback: voltar para a página de séries
            navigateTo('series');
        }
    }

    function clearObserver() {
        if (observer) {
            observer.disconnect();
            console.log('Observer desconectado');
        }
        const sentinel = document.getElementById('load-more-sentinel');
        if (sentinel) {
            sentinel.remove();
            console.log('Sentinela removida');
        }
    }

    function showPlaceholderIfNoCategory() {
        // Verificar se há categoria ativa
        const activeCategory = document.querySelector('.category-item.active');
        
        if (!activeCategory) {
            // Não há categoria selecionada, mostrar placeholder
            playerContainer.classList.remove('hidden');
            playerContainer.classList.remove('expanded');
            document.querySelector('.player-placeholder').style.display = 'flex';
            channelsGridElement.classList.remove('active');
            channelsGridElement.classList.remove('full-height');
            
            // Limpar observer
            clearObserver();
        }
    }

    function handleVideoError(event) {
        console.error('Erro no vídeo:', event);
        console.error('Erro ao reproduzir o canal. Tente outro canal.');
    }

    // Funções de UI
    function showLoading(message) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                color: white;
                font-size: 1.2rem;
            ">
                <div style="text-align: center;">
                    <i class="fas fa-spinner" style="font-size: 2rem; margin-bottom: 1rem; animation: spin 1s linear infinite;"></i>
                    <div>${message}</div>
                </div>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    }

    function hideLoading() {
        const loadingDiv = document.getElementById('loading-overlay');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }

    function showMessage(text, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = text;
        document.body.appendChild(messageDiv);
        
        setTimeout(() => messageDiv.classList.add('show'), 100);
        setTimeout(() => {
            messageDiv.classList.remove('show');
            setTimeout(() => messageDiv.remove(), 300);
        }, 4000);
    }

    // Tornar funções globais para uso em onclick
    window.navigateTo = navigateTo;
    window.backToSeries = backToSeries;
});
