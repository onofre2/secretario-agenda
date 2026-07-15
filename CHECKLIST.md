# Checklist de Conformidade — Master Spec v2.0

Legenda: ✅ completo · 🟡 parcial (funcional, com limitação anotada) · ⬜ não construído

## Arquitetura Core
- ✅ Expo + React Native + TypeScript
- ✅ SQLite (offline first, sem backend/servidor/login)
- ✅ Expo Notifications
- ✅ Funciona sem internet

## Módulo Hoje
- ✅ Compromissos do dia ordenados por horário
- ✅ Card com paciente, horário, clínica, valor
- ✅ Botão 🟢 Presente — registra presença, calcula receita, gera rascunho
  de evolução, atualiza financeiro e timeline, tudo em uma transação
- ✅ Botão 🔴 Ausente — registra falta, calcula perda financeira

## Notificações Inteligentes
- ✅ Lembrete antes de cada compromisso (10 min, configurável na Config)
- ✅ Ações direto na notificação: Presente / Ausente / Adiar 5 min
- ✅ Para automaticamente após o último compromisso do dia ser resolvido

## Assistente de Voz
- ✅ Leitura da agenda do dia ("Ler agenda")
- ✅ Leitura do resumo de fim de dia (atendimentos, presenças, faltas,
  receita, taxa de comparecimento, receita perdida)
- ⬜ Comandos de voz por reconhecimento de fala ("Patient present", "Open
  next patient") — arquiteturalmente adiado de propósito: reconhecimento de
  fala confiável offline não é viável no Expo gerenciado sem dependência de
  serviço online, o que conflita com o requisito "offline first" da v1. A
  spec já previa isso: "Voice commands should be prepared architecturally
  but may remain disabled in version 1."

## Agenda (horários recorrentes)
- ✅ Clínica, paciente, horário, dia da semana, valor da sessão
- ✅ Repetição semanal automática (geração idempotente de compromissos)
- ✅ Editar (via pausar/duplicar), pausar, duplicar, excluir

## Clínicas
- ✅ Múltiplas clínicas: nome, endereço, telefone, pagamento, notas
- 🟡 Receita/pacientes/atendimento "separados por clínica": receita por
  clínica está no Dashboard Financeiro; relatório de pacientes por clínica
  ainda não tem uma tela dedicada (dá para obter filtrando o relatório)

## Pacientes
- ✅ Todos os campos da spec (diagnóstico, objetivos, histórico, convênio,
  valor, contatos, observações)
- ✅ Timeline de atendimentos por paciente

## Evolução Clínica
- ✅ Rascunho gerado automaticamente ao marcar presença
- ✅ Editável pelo profissional antes de finalizar
- ✅ Histórico permanente
- ⬜ IA para sugerir evoluções (fora do escopo desta fase — spec já trata
  isso como "Future AI")

## Dashboard Financeiro
- ✅ Diário / Semanal / Mensal
- ✅ Atendimentos, presentes, ausentes, taxa de comparecimento
- ✅ Receita, receita perdida, receita por clínica (gráfico de barras)
- ⬜ Receita por paciente (não construído — fácil de adicionar depois,
  mesmo padrão do "por clínica")
- ⬜ Previsão de receita (forecast) — não construído

## Relatórios
- ✅ Semanal / Mensal / Anual
- ✅ Exportação em PDF, Excel (.xlsx) e CSV
- ✅ Atendimentos, presenças, faltas, receita, receita perdida

## Notificações (gerais)
- ✅ Lembretes de compromisso
- ⬜ Resumo semanal / mensal automático (push agendado) — não construído
- ⬜ Alertas financeiros automáticos — não construído
- ⬜ Notificação de mudança de horário — não construído

## Configurações
- 🟡 Modo escuro/claro: toggle funcional e persistido, mas a re-estilização
  visual completa para modo claro ainda não foi propagada por todas as
  telas (hoje tudo usa o tema escuro fixo)
- ⬜ Moeda/idioma configuráveis — fixos em BRL / pt-BR nesta versão
- ✅ Backup (exportar banco completo) e Restauração (importar e substituir)
- ⬜ Manutenção de banco (compactar/otimizar) — não construído

## Banco de Dados
- ✅ Todas as 10 tabelas da spec, com índices otimizados
- ✅ Migração de schema versionada (v1 → v2 testado)

## Verificação de Build (checklist da spec)
- ✅ Sintaxe de todos os arquivos verificada (balanceamento, imports)
- ✅ SQLite: schema + migração implementados e revisados
- ✅ Notificações: agendamento, cancelamento, ações — implementado
- ✅ Voz: leitura implementada
- 🟡 Modo escuro/claro: modo escuro funciona; claro é só a preferência
- ✅ Persistência de dados: todas as escritas passam por transações onde
  há múltiplas tabelas envolvidas
- ✅ Botões de presença/ausência: lógica completa e testável
- ✅ Cálculos financeiros: revisados (receita, perda, por clínica)
- ✅ Relatórios: geração e exportação implementadas
- ✅ Funciona completamente offline (nenhuma chamada de rede em nenhum módulo)
- ⬜ **Não testado em dispositivo real / Expo Go / build EAS** — isso só
  pode ser feito por você, já que dependo da sua máquina e conta Expo

## Entrega Final (o que falta para "concluído" segundo a spec)
1. ✅ Código-fonte completo e verificado (este pacote)
2. ⬜ Você rodar `npm install` e `npx expo start` para validar no Expo Go
3. ⬜ Você rodar `eas login`, `eas init`, `eas build --platform android
   --profile preview`
4. ⬜ Link de download do APK (só existe depois do passo 3, na sua conta)

A spec é explícita: "o entregável final não é código-fonte, é um APK
funcional". Eu não consigo gerar esse link sem acesso à internet/sua conta —
mas todo o código que antecede esse passo está pronto e revisado.
