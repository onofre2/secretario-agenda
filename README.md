# Secretário Agenda — Projeto completo (Módulos 1 a 8)

## 📋 Leia primeiro: `CHECKLIST.md`
Documento com a conformidade item a item contra a Master Spec original —
o que está ✅ completo, 🟡 parcial (com a limitação explicada) e ⬜ fora do
escopo desta fase.

## Módulo 8 — Fechamento
- Verificação de sintaxe e de todos os imports do projeto (sem erros)
- Módulo de **Assistente de Voz** adicionado: botões "🔊 Ler agenda" e
  "🔊 Resumo do dia" na tela Hoje, usando síntese de voz offline
  (`expo-speech`). Comandos de voz por reconhecimento de fala ficam fora
  desta versão — decisão deliberada, explicada no checklist
- `CHECKLIST.md` criado com o mapeamento completo spec → implementação

## 🚀 Passo a passo final (você faz na sua conta Expo)

```bash
# 1. Extrair o zip e entrar na pasta
cd secretario-agenda

# 2. Instalar dependências
npm install

# 3. Alinhar as versões exatas esperadas pelo SDK do Expo
#    (importante: eu não tenho acesso à internet para conferir os números
#    de versão mais recentes de cada pacote, então este comando corrige
#    automaticamente qualquer divergência antes do build)
npx expo install --fix

# 4. Testar no Expo Go
npx expo start
# Escaneie o QR code e confirme que tudo funciona:
# cadastre 1 clínica, 1 paciente, 1 horário, veja aparecer em Hoje,
# marque presença, confira Financeiro e Relatórios.

# 5. Login e vínculo com o EAS
npx eas login
npx eas init
# Copie o projectId gerado para app.json > extra.eas.projectId

# 6. Gerar o APK
npx eas build --platform android --profile preview
```

Ao final do passo 6, o terminal e o painel em expo.dev mostram o link de
download do APK — isso fecha o ciclo pedido na spec original.

## Se algo der erro no passo 3 ou 4
Como não tenho rede neste ambiente, não consegui rodar `npm install` /
`expo start` por aqui para testar de ponta a ponta. Se aparecer algum erro
de dependência incompatível ou de código, me manda a mensagem de erro
completa que eu ajusto o arquivo correspondente.

---

## Histórico dos módulos

### Módulo 7 — Relatórios e Configurações
- Nova aba **Relatórios**: seletor Semanal / Mensal / Anual, lista de
  atendimentos do período e exportação em **PDF**, **Excel (.xlsx)** e
  **CSV** — usa o menu nativo de compartilhar/salvar do celular
- Nova aba **Config**:
  - Modo escuro (toggle salvo — a troca visual completa pro modo claro fica
    para uma próxima passada de polimento; hoje o app é todo tema escuro,
    mas a preferência já é persistida)
  - Antecedência do lembrete de notificação (campo salvo; hoje o valor
    efetivo usado ainda é fixo em 10 min — próxima integração conecta esse
    número ao agendador)
  - **Exportar backup**: gera um arquivo `.db` com tudo (pacientes,
    clínicas, agenda, financeiro, evoluções) e abre o menu de compartilhar
  - **Restaurar backup**: escolhe um arquivo `.db` exportado antes e
    substitui todos os dados atuais (com confirmação, porque é destrutivo)

⚠️ Novas dependências neste módulo: `expo-print`, `expo-sharing`,
`expo-file-system`, `expo-document-picker`, `xlsx`. Rode `npm install` de
novo antes de testar.

## Módulo 6
- Na aba **Pacientes**, cada card agora tem "Ver histórico clínico →"
- Abre a **timeline completa** do paciente: todos os atendimentos
  (data, horário, clínica, valor, status)
- Cada atendimento com presença mostra a **evolução clínica** gerada
  automaticamente (rascunho) no Módulo 1 — agora totalmente **editável**:
  toque em "Editar", ajuste o texto, salve. Depois de salvo uma vez, o
  rascunho deixa de ser marcado como "(rascunho)" e vira nota finalizada
- O profissional sempre revisa antes de finalizar — a IA (rascunho
  automático) nunca substitui o julgamento clínico, só dá o ponto de
  partida

Teste: marque presença em um paciente na aba Hoje, depois vá em Pacientes →
esse paciente → Ver histórico clínico. O rascunho deve aparecer, e editar +
salvar deve persistir.

## Módulo 5
- Lembrete automático **10 minutos antes** de cada compromisso pendente
- Notificação com 3 botões de ação, sem precisar abrir o app:
  - 🟢 Presente
  - 🔴 Ausente
  - Adiar 5 min
- Ao marcar presente/ausente (seja pela notificação ou pelo app), a
  notificação daquele compromisso é cancelada automaticamente
- Depois do último paciente do dia não sobra nenhum lembrete pendente
  (efeito natural de cada compromisso já resolvido ter sua notificação
  cancelada)
- Migração de banco automática (v1 → v2) para quem já tinha o app dos
  módulos anteriores instalado

⚠️ **Limitação importante do Expo Go**: notificações remotas/push não
funcionam no Expo Go a partir do SDK 53, mas as notificações **locais**
usadas aqui (agendadas no próprio aparelho, sem servidor) funcionam
normalmente tanto no Expo Go quanto no APK gerado pelo EAS. Ainda assim,
para testar de verdade meu conselho é gerar o APK e instalar no celular —
é mais fiel ao comportamento final.

Para testar rápido: cadastre um compromisso daqui a ~12 minutos (edite um
horário na Agenda) e deixe o app em segundo plano — a notificação deve
aparecer uns 10 minutos antes do horário marcado, com os 3 botões.

## Módulo 4
- Dashboard **Financeiro** com seletor Diário / Semanal / Mensal
- Cards de resumo: Receita, Perda por faltas, Total de atendimentos, Taxa de
  comparecimento
- Gráfico de barras (feito com Views puras, sem lib externa — mais seguro
  pro build) de receita por clínica
- Pull-to-refresh

Teste: marque alguns compromissos como Presente/Ausente na aba Hoje, depois
vá em Financeiro e confira se os números batem.

## Módulo 3
- **Clínicas**: listar, criar, editar e excluir (nome, endereço, telefone,
  informações de pagamento, notas)
- **Pacientes**: listar, criar, editar e excluir (nome, telefone, email,
  valor padrão da sessão, convênio, diagnóstico, objetivos do tratamento,
  contato de emergência, observações)
- **Agenda**: horários recorrentes semanais — escolher paciente e clínica
  (seleção via lista), dia da semana (chips Dom–Sáb), horário e valor da
  sessão. Ações: pausar, duplicar, excluir
- Componentes reutilizáveis novos: `FormInput`, `PrimaryButton`,
  `SelectField` (picker em modal), `FloatingAddButton`

**Agora sim a tela Hoje vai mostrar dados de verdade:** cadastre pelo menos
uma clínica, um paciente e um horário recorrente para o dia da semana atual,
depois abra a aba Hoje — o compromisso deve aparecer automaticamente com os
botões Presente/Ausente.

## Módulo 2
- Navegação com abas inferiores: Hoje / Agenda / Pacientes / Clínicas / Financeiro
- Tela **Hoje** 100% funcional:
  - Gera automaticamente os compromissos do dia a partir da agenda recorrente
  - Lista ordenada por horário, com nome do paciente, clínica e valor
  - Botões grandes 🟢 Presente / 🔴 Ausente que disparam toda a lógica de um
    toque (`markPresent` / `markAbsent`) construída no Módulo 1
  - Resumo no topo: total de compromissos e receita esperada do dia
  - Pull-to-refresh
- Demais abas (Agenda, Pacientes, Clínicas, Financeiro) como placeholders —
  serão preenchidas nos próximos módulos, mas a navegação entre elas já
  funciona

⚠️ Como ainda não há tela de cadastro de Pacientes/Clínicas/Horários, a lista
"Hoje" vai aparecer vazia até o Módulo 3 (cadastros) ser construído — isso é
esperado nesta etapa. O importante agora é confirmar que o app abre, navega
entre as abas e não quebra.

## O que foi construído no Módulo 1
- Projeto Expo + TypeScript configurado (`app.json`, `eas.json`, `tsconfig.json`)
- Schema completo do SQLite (10 tabelas da spec): clinics, patients, schedules,
  appointments, attendance, clinical_notes, financial_records, settings,
  notification_log, backups — com índices otimizados
- Camada de acesso a dados (`src/database/`) com repositórios para:
  - Clínicas (CRUD)
  - Pacientes (CRUD + timeline)
  - Horários recorrentes semanais (criar/pausar/duplicar/excluir + gerar
    compromissos do dia)
  - Compromissos, incluindo a lógica de **um toque** `markPresent` /
    `markAbsent` (registra presença, calcula receita, gera rascunho de
    evolução clínica e atualiza financeiro — tudo em uma transação)
  - Resumo financeiro (diário/semanal/mensal, receita por clínica)
- `App.tsx` provisório que só inicializa o banco e confirma que está tudo
  funcionando (próximo módulo troca isso pela navegação real)

## Verificação do Módulo 1 (checklist)
- [x] Schema SQLite criado e versionado
- [x] Índices otimizados
- [x] Transações atômicas na lógica de presença/ausência
- [ ] Testado dentro do Expo Go (você confirma ao rodar)
- [ ] Build gerado no EAS (você roda os comandos no topo deste README)
