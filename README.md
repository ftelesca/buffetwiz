# 🍽️ BuffetWiz

**Sistema Inteligente de Gestão para Buffets e Catering**

BuffetWiz é uma solução completa para gestão de buffets, empresas de catering e serviços de alimentação. Com IA integrada, cálculos automáticos de custos e interface moderna, oferece tudo que você precisa para gerenciar seus eventos com eficiência.

---

## 🚀 Características Principais

### 📅 **Gestão de Eventos**
- **Calendário Integrado**: Visualização e organização de eventos por data
- **Detalhes Completos**: Cliente, local, duração, número de convidados
- **Integração Google Calendar**: Sincronização automática de eventos
- **Controle de Status**: Acompanhamento do andamento dos eventos
- **Cálculo Automático**: Custos e preços calculados em tempo real

### 🍲 **Produtos e Receitas**
- **Cadastro de Produtos**: Gestão completa de itens do menu
- **Receitas Detalhadas**: Ingredientes, quantidades e rendimento
- **Cálculo de Custos**: Preço por unidade calculado automaticamente
- **Controle de Eficiência**: Rendimento real vs. teórico
- **Importação em Massa**: Upload via planilhas Excel/CSV

### 📦 **Gestão de Insumos**
- **Cadastro de Ingredientes**: Base completa de matérias-primas
- **Unidades de Medida**: Flexibilidade total nas unidades
- **Controle de Custos**: Preços de compra e fatores de conversão
- **Relatórios de Consumo**: Análise detalhada de uso

### 🤖 **Assistente IA Integrado**
- **Chat Inteligente**: Consultas sobre produtos, custos e eventos
- **Análises Automáticas**: Insights sobre rentabilidade e eficiência
- **Sugestões Personalizadas**: Recomendações baseadas no histórico
- **Suporte 24/7**: Ajuda instantânea para operações

### 📊 **Relatórios e Exportação**
- **Múltiplos Formatos**: PDF, Excel, Word
- **Relatórios Personalizados**: Eventos, custos, rentabilidade
- **Análises Visuais**: Gráficos e dashboards interativos
- **Exportação Automática**: Integração com sistemas externos

---

## 🛠️ Tecnologias

### **Frontend**
- **React 18** - Interface moderna e responsiva
- **TypeScript** - Tipagem estática para maior confiabilidade
- **Tailwind CSS** - Design system consistente
- **shadcn/ui** - Componentes de interface elegantes
- **React Query** - Gerenciamento de estado e cache
- **React Router** - Navegação entre páginas

### **Backend & Database**
- **Supabase** - Backend as a Service completo
- **PostgreSQL** - Banco de dados robusto e escalável
- **Row Level Security (RLS)** - Segurança por usuário
- **Edge Functions** - Lógica serverless customizada
- **Real-time** - Atualizações em tempo real

### **Funcionalidades Avançadas**
- **Autenticação Supabase** - Login seguro e gestão de usuários
- **Embeddings AI** - Processamento de linguagem natural
- **Integração Google Calendar** - Sincronização de eventos
- **Export Engine** - Geração de documentos profissionais

---

## 📁 Estrutura do Projeto

```
src/
├── components/           # Componentes reutilizáveis
│   ├── auth/            # Autenticação e perfil
│   ├── chat/            # Sistema de chat com IA
│   ├── events/          # Gestão de eventos
│   ├── recipes/         # Produtos e receitas
│   ├── supplies/        # Gestão de insumos
│   ├── layout/          # Layout da aplicação
│   └── ui/              # Componentes de interface
├── contexts/            # Contextos React
├── hooks/               # Hooks customizados
├── integrations/        # Integrações externas
├── lib/                 # Utilitários e helpers
├── pages/               # Páginas da aplicação
└── types/               # Definições de tipos
```

---

## 🗃️ Modelo de Dados

### **Tabelas Principais**

#### **Events (Eventos)**
```sql
- id, title, description, location
- customer, date, time, duration, numguests
- cost, price, status, type
- user_id (RLS)
```

#### **Recipes (Produtos)**
```sql
- id, description, efficiency
- user_id (RLS)
```

#### **Items (Insumos)**
```sql
- id, description, cost, factor
- unit_purch, unit_use, isproduct
- user_id (RLS)
```

#### **Recipe_Items (Receitas)**
```sql
- recipe, item, qty
- (Liga produtos aos ingredientes)
```

#### **Event_Menu (Menu do Evento)**
```sql
- event, recipe, qty, produced
- (Liga eventos aos produtos)
```

### **Funcionalidades do Banco**
- **RLS Policies**: Isolamento total de dados por usuário
- **Foreign Keys**: Integridade referencial garantida
- **Triggers**: Atualização automática de timestamps
- **Views**: Consultas otimizadas para relatórios

---

## ⚙️ Instalação e Configuração

### **Pré-requisitos**
- Node.js 18+ 
- npm ou yarn
- Conta Supabase (gratuita)

### **1. Clone do Repositório**
```bash
git clone <YOUR_GIT_URL>
cd buffet-wiz
npm install
```

### **2. Configuração do Ambiente**
```bash
# Copie e configure as variáveis
cp .env.example .env

# Configure no .env:
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_supabase
```

### **3. Configuração do Supabase**

#### **Banco de Dados**
Execute as migrations SQL no painel do Supabase:
```sql
-- Criação de tabelas com RLS
-- Políticas de segurança
-- Triggers e funções
-- (Veja supabase/migrations/)
```

#### **Autenticação**
- Configure provedores de login (Email, Google, etc.)
- Defina URLs de redirecionamento
- Configure templates de email

#### **Edge Functions**
```bash
# Deploy das funções serverless
supabase functions deploy wizard-chat
supabase functions deploy wizard-export
```

### **4. Desenvolvimento**
```bash
# Inicie o servidor de desenvolvimento
npm run dev

# Acesse: http://localhost:5173
```

---

## 🔥 Funcionalidades Destacadas

### **Cálculo Automático de Custos**
O sistema calcula automaticamente:
- **Custo por produto** baseado nos ingredientes
- **Custo total do evento** considerando quantidades
- **Margem de lucro** e preço sugerido
- **Análise de rentabilidade** por evento

### **Controle de Produção Visual**
- **Status de produção** por produto no evento
- **Indicadores visuais** de progresso
- **Check-list automático** de preparação
- **Timeline de produção** otimizada

### **Assistente IA Inteligente**
- **Embeddings semânticos** para busca avançada
- **Cache inteligente** de respostas
- **Análise de dados** em linguagem natural
- **Sugestões contextuais** baseadas no histórico

### **Exportação Profissional**
- **PDFs customizados** com marca da empresa
- **Planilhas detalhadas** para análise
- **Orçamentos automáticos** para clientes
- **Relatórios gerenciais** completos

---

## 🔒 Segurança

### **Autenticação Robusta**
- **JWT tokens** seguros
- **Session management** otimizado
- **Password reset** automático
- **Multi-factor authentication** (opcional)

### **Isolamento de Dados**
- **Row Level Security (RLS)** em todas as tabelas
- **Políticas específicas** por usuário
- **Auditoria de acesso** completa
- **Backup automático** de dados

### **Proteção de API**
- **Rate limiting** automático
- **Validação de entrada** rigorosa
- **Sanitização de dados** SQL injection proof
- **CORS configurado** adequadamente

---

## 🌐 Compatibilidade

### **Navegadores Suportados**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### **Dispositivos**
- **Desktop**: Funcionalidade completa
- **Tablet**: Interface adaptada
- **Mobile**: Visualização otimizada
- **PWA Ready**: Instalação como app

### **Integrações**
- **Google Calendar**: Sincronização bidirecional
- **Excel/CSV**: Importação e exportação
- **Email**: Notificações automáticas
- **WhatsApp**: Compartilhamento de orçamentos

---

## 🤝 Contribuição

### **Como Contribuir**
1. Faça um fork do projeto
2. Crie uma branch para sua feature
3. Implemente suas mudanças
4. Teste thoroughly
5. Submeta um Pull Request

### **Padrões de Código**
- **TypeScript strict mode**
- **ESLint + Prettier**
- **Conventional Commits**
- **Component-driven development**

### **Testes**
- **Unit tests** para funções críticas
- **Integration tests** para fluxos principais
- **E2E tests** para user journeys
- **Performance monitoring**

---

## 📄 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

### **Uso Comercial**
✅ Permitido uso comercial  
✅ Modificação e distribuição  
✅ Uso privado  
⚠️ Sem garantias (conforme MIT License)  

---

## 🆘 Suporte

### **Documentação**
- **Wiki Completa**: [docs.buffetwiz.com](https://docs.buffetwiz.com)
- **API Reference**: [api.buffetwiz.com](https://api.buffetwiz.com)
- **Video Tutoriais**: [youtube.com/buffetwiz](https://youtube.com/buffetwiz)

### **Comunidade**
- **Discord**: [discord.gg/buffetwiz](https://discord.gg/buffetwiz)
- **GitHub Issues**: Para bugs e features
- **Stack Overflow**: Tag `buffetwiz`

### **Suporte Técnico**
- **Email**: suporte@buffetwiz.com
- **WhatsApp**: +55 11 99999-9999
- **Horário**: Segunda a Sexta, 9h-18h BRT

---

## 🚀 Deploy e Produção

### **Deploy Automático**
```bash
# Via Lovable (Recomendado)
# Acesse: https://lovable.dev/projects/6b95d1bf-8b41-44aa-a559-7242fdc29064
# Click: Share -> Publish

# Build manual
npm run build
npm run preview
```

### **Variáveis de Produção**
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_producao
```

### **Monitoramento**
- **Error tracking** com Sentry
- **Performance monitoring** integrado
- **Uptime monitoring** 24/7
- **Analytics** detalhado de uso

---

## 📈 Roadmap

### **Próximas Features**
- [ ] **App Mobile** nativo (React Native)
- [ ] **Integração POS** para vendas diretas
- [ ] **BI Dashboard** avançado
- [ ] **Multi-tenancy** para franquias
- [ ] **API Pública** para integrações

### **Melhorias Planejadas**
- [ ] **Otimização de performance**
- [ ] **Acessibilidade WCAG 2.1**
- [ ] **Internacionalização** (i18n)
- [ ] **Modo offline** com sync
- [ ] **Temas customizáveis**

---

**Desenvolvido com ❤️ para a comunidade de buffets e catering**

*BuffetWiz - Transformando a gestão de eventos em uma experiência inteligente e eficiente.*