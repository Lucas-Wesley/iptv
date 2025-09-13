# 🎬 Player de IPTV Inteligente

Sistema completo de player IPTV com backend Node.js e frontend otimizado.

## 🚀 Funcionalidades

- ✅ Upload de arquivos M3U/M3U8 (até 100MB)
- ✅ Processamento automático no backend
- ✅ Organização por categorias
- ✅ Cache inteligente (localStorage + servidor)
- ✅ Suporte a múltiplos formatos (HLS, MP4)
- ✅ Interface moderna e responsiva
- ✅ Sistema de backup automático

## 📋 Pré-requisitos

- Node.js 16+ instalado
- NPM ou Yarn

## 🛠️ Instalação

1. **Instalar dependências:**
```bash
npm install
```

2. **Iniciar o servidor:**
```bash
npm start
```

3. **Para desenvolvimento (com auto-reload):**
```bash
npm run dev
```

## 🌐 Uso

1. **Acesse:** `http://localhost:3000`
2. **Upload:** Clique em "Carregar Arquivo .m3u" e selecione seu arquivo
3. **Navegação:** Use as categorias à esquerda e canais no meio
4. **Reprodução:** Clique em qualquer canal para assistir

## 📁 Estrutura do Projeto

```
iptv-player/
├── server.js              # Servidor principal
├── package.json           # Dependências
├── public/
│   └── index.html         # Frontend
├── data/
│   ├── playlist.json      # Playlist processada
│   └── backup/            # Backups automáticos
└── uploads/               # Arquivos temporários
```

## 🔧 API Endpoints

- `POST /api/upload-playlist` - Upload e processamento de M3U
- `GET /api/playlist` - Buscar playlist atual
- `GET /api/categories` - Listar categorias
- `GET /api/channels/:category` - Canais por categoria
- `GET /api/status` - Status do servidor

## 📊 Formato dos Dados

### Estrutura JSON da Playlist:
```json
{
  "metadata": {
    "lastUpdated": "2024-01-15T10:30:00Z",
    "totalChannels": 1250,
    "totalCategories": 45,
    "version": "1.0"
  },
  "categories": {
    "CANAIS | SBT": {
      "name": "CANAIS | SBT",
      "channels": [
        {
          "id": "canais_sbt_001",
          "name": "SCC (SBT)",
          "logo": "https://imgscc.top/logos/sbt2.png",
          "url": "http://example.com/stream.m3u8",
          "isActive": true
        }
      ]
    }
  }
}
```

## 🎯 Características Técnicas

- **Backend:** Node.js + Express
- **Frontend:** HTML5 + CSS3 + JavaScript Vanilla
- **Streaming:** HLS.js para compatibilidade
- **Cache:** localStorage + servidor
- **Upload:** Multer (até 100MB)
- **Backup:** Automático com timestamp

## 🔒 Segurança

- Validação de tipos de arquivo
- Limite de tamanho de upload
- Sanitização de dados
- Tratamento de erros robusto

## 📱 Compatibilidade

- ✅ Chrome/Edge (recomendado)
- ✅ Firefox
- ✅ Safari
- ✅ Dispositivos móveis

## 🐛 Solução de Problemas

### Erro de Upload:
- Verifique se o arquivo é .m3u ou .m3u8
- Confirme se o tamanho é menor que 100MB
- Verifique a conexão com o servidor

### Canais não carregam:
- Verifique se as URLs estão acessíveis
- Confirme se o formato é suportado (HLS/MP4)
- Teste em outro navegador

### Performance lenta:
- Use cache local (automático)
- Reduza o tamanho da playlist
- Verifique a conexão de internet

## 📞 Suporte

Para problemas ou sugestões, verifique:
1. Console do navegador (F12)
2. Logs do servidor
3. Estrutura do arquivo M3U

## 🔄 Atualizações

O sistema mantém:
- Backup automático de playlists
- Cache local para performance
- Logs detalhados de operações

---

**Desenvolvido com ❤️ para streaming IPTV**
