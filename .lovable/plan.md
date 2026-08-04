# VetSystem — Plano de Construção

Escopo enorme. Vou entregar em **fases**, cada uma funcional e testável. Confirme a fase 1 para começar.

## Stack
- TanStack Start (React 19 + Vite) — equivalente moderno do que foi pedido (React + Vite + Router)
- TailwindCSS v4 + shadcn/ui + Framer Motion
- Zustand (estado) + TanStack Query (server state)
- **Lovable Cloud** (Supabase gerenciado) — auth, DB, storage
- **Dexie.js** (IndexedDB) + fila de sincronização
- PWA: manifest + service worker (com guardas para preview do Lovable)
- jsPDF para PDFs, react-signature-canvas para assinatura

## Fase 1 — Fundação + Auth + Dashboard (esta entrega)
- Design system premium (dark mode default, tons tecnológicos tipo Linear)
- Ativar Lovable Cloud
- Auth (email/senha + Google), roles: admin / veterinário / recepção (tabela `user_roles` + `has_role`)
- Layout SaaS: sidebar colapsável, navbar com indicador online/offline + status de sync, busca global
- Dashboard com cards animados + gráficos (recharts) + skeleton loading
- Setup Dexie + store offline + detecção de conexão + toast
- PWA básico (manifest + SW desabilitado em iframe do preview)

## Fase 2 — Clientes, Animais, Agenda
- CRUD clientes (CPF/CNPJ, WhatsApp, endereço)
- CRUD animais (foto via storage, tutor, alergias, medicamentos)
- Agenda mensal/semanal (consultas, cirurgias, retornos, banho) com cores por categoria
- Tudo com mirror offline no Dexie + fila de sync

## Fase 3 — Prontuário Clínico + Vacinas + PDFs
- Histórico clínico (sintomas, diagnóstico, prescrição, upload exames/imagens, assinatura digital)
- Vacinas + alertas de vencimento
- Geração de PDF (receita, atestado, carteira de vacinação)

## Fase 4 — Odontograma Equino Interativo
- SVG do crânio equino com arcadas superior/inferior, dentes numerados (sistema Triadan)
- Cada dente: componente clicável, modal de procedimento (extração, desgaste, fratura, limpeza, correção)
- Cores/marcações por status, legenda, zoom, suporte tablet
- Histórico odontológico + comparação entre atendimentos + PDF

## Fase 5 — Financeiro + Visitas Rurais + WhatsApp
- Fluxo de caixa, recebidas/pendentes, relatórios
- Módulo rural com geolocalização, propriedade, rebanho (offline-first)
- Estrutura de notificações WhatsApp (server fn pronta para integrar provedor)

## Schema do banco (Fase 1 cria as tabelas base; demais fases adicionam)
`profiles`, `user_roles`, `clients`, `pets`, `appointments`, `medical_records`, `vaccines`, `financial_entries`, `farms`, `farm_visits`, `odontograms`, `odontogram_teeth`, `files`, com RLS por `auth.uid()` e policies via `has_role`.

## Observações importantes
- **PWA dentro do preview do Lovable**: o service worker fica desativado em iframe (recomendação oficial) — funciona 100% só no app publicado/instalado. Dexie funciona em ambos.
- **WhatsApp**: só estrutura; integração real (Twilio/UAZAPI) requer chave e será pedida na Fase 5.
- **Tamanho**: cada fase é ~1-2 mensagens minhas. Tentar tudo de uma vez resulta em código quebrado.

Posso começar pela **Fase 1**?