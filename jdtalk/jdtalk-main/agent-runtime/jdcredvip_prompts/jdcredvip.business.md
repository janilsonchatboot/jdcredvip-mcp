# JD CRED VIP – Inteligência de Negócio e Políticas Operacionais
_Versão: 2025-11-01 • Projeto: JD Talk + Codex Realtime Agent_

> **Propósito**: padronizar a análise de clientes, a oferta de produtos e a automação comercial do ecossistema **JD CRED VIP** (JD Talk + Codex Realtime Agent + Supabase). Este documento é lido por agentes de IA e por pessoas da equipe.

---

## 1) Identidade, princípios e contexto
- **Marca**: JD CRED VIP — Agência de Empréstimos Consignados e Soluções Financeiras.  
- **Canais**: WhatsApp **84 98856-2331**, Instagram **@jd.cred**, Facebook **Prospere Já Cred**.  
- **Atendimento**: seg–sex, **09:00–18:00 (America/Fortaleza)**.  
- **Valores-guia**: **Transparência • Acolhimento • Solução Rápida**.  
- **Slogan**: _“Fé que constrói, visão que realiza!”_  
- **Público-chave**: renda até 3 salários mínimos; Aposentados/Pensionistas (INSS), BPC/LOAS, CLT, beneficiários de programas sociais, consumidores com conta de energia ativa (COSERN/RN e outras).

---

## 2) Portfólio de produtos e premissas
Produtos atualmente operados (v. 2025-10-14/28):
1. **INSS Consignado** (contrato novo) e **Cartão Consignado (RMC/RCC)**  
2. **FGTS – Antecipação Saque-Aniversário**
3. **CLT – Crédito do Trabalhador** (via Facta Financeira; até **R$ 20.000** em até **48x**)
4. **Empréstimo na Conta de Luz** (Crefaz; verificar **tarifa social**)
5. **Crédito Pessoal Bolsa Família** (Crefisa; requer **tarifa social** na conta de energia)
6. **Crédito Pessoal** (ticket acima de **R$ 750** quando aplicável)
7. **Portabilidade**, **Refinanciamento** e **Contrato Novo** (linha INSS)

**Premissas gerais**
- Sempre oferecer **produto compatível** com perfil/benefício/renda/região do cliente.
- Validar **documentos e consentimento** antes de registrar dados sensíveis.
- Evitar insistência indevida: orientar com clareza e respeito, manter histórico.

---

## 3) Taxonomia de status e campos de CRM
Campos em Supabase (espelho do CRM/planilha):
- `status_comercial`: _Novo_, _Em contato_, _Em análise_, _Documentação_, _Aguardando banco_, _Fechado_, _Perdido_, _Não retornou_.
- `situacao`: estado operacional do lead/contrato (ex.: _Pré-aprovado_, _Aprovado_, _Liquidado_, _Indeferido_).
- `ultimo_contato` (timestamp), `proximo_contato` (timestamp), `dias_ate_o_follow_up` (int).
- `origem_comissao`, `situacao_comissao` (_Pendente_, _A liberar_, _Paga_).
- `resultado_fechado_nao_fechado`, `motivo_da_perda`/`motivo_da_perda_observacoes_estrategicas`.
- `observacoes_estrategicas`: histórico e acordos comerciais relevantes.
- `promotora`, `banco`, `convenio`, `contrato_ade` (quando aplicável).
- Volumes: `volume_bruto_r`, `volume_liquido_r`, `comissao_liquida` (R$).

**Padrões**
- Atualizar `status_comercial` e `situacao` **a cada contato**.
- Recalcular `dias_ate_o_follow_up` ao editar `proximo_contato`.
- Registrar `motivo_da_perda` quando `status_comercial = Perdido`.

---

## 4) Regras de triagem por perfil
1) **INSS / Pensionistas / LOAS / BPC**
   - Elegíveis: **Contrato novo INSS** e **Cartão Consignado**.
   - Se **margem zerada**: avaliar **Refinanciamento**; considerar **Cartão Consignado**.
   - **Portabilidade**: ver seção 6.

2) **Trabalhador CLT**
   - Elegível a **Crédito Trabalhador (Facta)**, até R$ 20.000/48x (regras atuais do parceiro).
   - Se tiver **saldo FGTS**: sugerir **FGTS** (antecipação) e avaliar CLT.

3) **FGTS – Saque-Aniversário**
   - Oferecer conforme regras vigentes (mudanças de mercado/BACEN).  
   - Adequado para negativados; ticket médio **R$ 1.200–3.000**.

4) **Conta de Luz (Crefaz)**
   - Exigir **conta de energia ativa**; verificar **tarifa social** (quando existir, abre elegibilidade para Bolsa Família).  
   - Pode atender público negativado.

5) **Crédito Pessoal Bolsa Família (Crefisa)**
   - **Condicional à tarifa social** ativa na conta de energia.  
   - Usar cross-check com a base de Conta de Luz.

6) **Crédito Pessoal (privado)**
   - Ticket acima de **R$ 750** (clientes sem margem consignável).

**Regra operacional JD CRED VIP (2025-10-31)**  
> Se o cliente **já fez empréstimo na Conta de Luz**, **verificar tarifa social**: havendo, **elegível a Bolsa Família**.

---

## 5) Upsell e cross-sell (automático)
- **FGTS →** sugerir **Crédito Trabalhador (CLT)**.  
- **CLT →** sugerir **Conta de Luz**.  
- **Conta de Luz (com tarifa social) →** sugerir **Bolsa Família**.  
- **BPC/LOAS →** sugerir **INSS** (quando possível) ou **Crédito Pessoal**.  
- **INSS (refinanciado) →** sugerir **Cartão Consignado**.

Sempre registrar upsell recomendado no histórico e sinalizar no painel.

---

## 6) Portabilidade — regras de negócio
**Aplicação**: INSS/Pensionistas/LOAS/BPC com contrato ativo em outro banco.  
**Oferecer quando**:
1. Contrato original com **≥ 90 dias de vigência** (ou conforme política vigente).  
2. Houver **redução real de parcela** _ou_ **melhor taxa efetiva (CET)**.  
3. Não comprometer benefício (mesmo convênio).  
4. Cliente **ciente de que é gratuito** e que mantém benefício/banco recebedor.

**Procedimento**
- Coletar dados do contrato (banco, taxa, parcela, prazo, saldo devedor).  
- Simular com taxa competitiva; **comparar CET**.  
- Propor de forma transparente (print/simulação arquivada).  
- Atualizar `origem_comissao = Portabilidade` quando aplicável.

**Script sugerido**
> “Verifiquei aqui: sua parcela pode cair de **R$ 420** para **R$ 355**, mantendo prazo.  
> Preferem que eu **envie a simulação** pra você avaliar sem compromisso?”

---

## 7) Refinanciamento — regras de negócio
**Aplicação**: clientes **INSS** com contrato ativo **no mesmo banco**.  
**Oferecer quando**:
1. **≥ 6 parcelas pagas** (ou conforme política do banco).  
2. Houver **margem liberada** e condição de **liberação de novo valor**.  
3. Taxa em linha com a política vigente da promotora/banco.

**Procedimento**
- Levantar saldo, parcela, taxa e prazo restantes.  
- Simular refin liberando valor líquido e explicitar nova taxa/prazo.  
- Registrar `origem_comissao = Refin` e **arquivar proposta**.

**Script sugerido**
> “Seu contrato permite **liberar um novo valor agora**, sem trocar de banco.  
> Posso simular e te dizer **quanto sai líquido**?”

---

## 8) Follow-up e ciclo comercial
- Primeiro contato em até **24 h** após entrada do lead.  
- Cadência de follow-up: **a cada 2–3 dias úteis** (ajustar conforme resposta).  
- Leads em `situacao = Em análise`: **revisar semanalmente**.  
- Após **3 tentativas sem resposta**: marcar **Não retornou** e agendar retorno leve futuro.  
- Sempre preencher `proximo_contato`, `dias_ate_o_follow_up` e notas.

**Boas práticas de atendimento (voz humana)**
- Empatia + solução: “Vamos resolver rapidinho pra você.”  
- Explicar termos financeiros com exemplos simples.  
- Evitar jargões; **transparência** sobre taxas, prazos, CET e condições.

---

## 9) Comissão (faixas indicativas)
> As faixas variam por promotora/banco e podem mudar. Registrar a política vigente.

| Produto                         | Comissão média (indicativa) |
|---------------------------------|-----------------------------|
| INSS / Cartão Consignado        | **15–18%**                  |
| FGTS                            | **10–12%**                  |
| CLT (Facta)                     | **≈ 20%**                   |
| Conta de Luz (Crefaz)           | **12–15%**                  |
| Bolsa Família (Crefisa)         | **≈ 10%**                   |
| Crédito Pessoal                 | **18–20%**                  |

Eventos automáticos sugeridos:
- `situacao_comissao = "Paga"` → **notificar** e **incluir em relatório semanal**.
- `Fechado` → sinalizar no ranking e painéis.

---

## 10) Indicadores e metas
- **Conversão esperada**: **35–45%** leads fechados.  
- **Ticket médio**: **R$ 1.200–3.000**.  
- **Tempo médio de 1ª resposta**: **< 1 hora**.  
- **Refinanciamento/recompra**: meta **≥ 20%** da base.

**Painéis de acompanhamento**
- Leads por produto/canal, funil por etapa, tempo de resposta, % conversão, comissões por promotora/banco.

---

## 11) Automação (Codex Realtime Agent)
**Ações padrão por evento (Supabase Realtime):**
- `INSERT fgts_saque_aniversario` → gerar resumo IA + sugerir follow-up inicial.  
- `UPDATE inss` (margem liberada) → sugerir **Refin**; se taxa nova < antiga, **Portabilidade**.  
- `UPDATE conta_luz` (tarifa social = true) → sugerir **Bolsa Família**.  
- `UPDATE situacao_comissao = "Paga"` → notificar dashboard + apontar em relatório semanal.  
- `UPDATE follow_ups` → recomputar `dias_ate_o_follow_up` e agenda.  
- `INSERT carteira_triagem_historico` → registrar analytics de decisão.

**Boas práticas técnicas**  
- Usar canais `private` com RLS ativo e regras mínimas de exposição.  
- Logs: `logs/realtime.log` + trilha no JD Talk.  
- Reconexão e limpeza de assinaturas conforme guia Supabase Realtime.

---

## 12) Segurança, LGPD e privacidade
- Capturar e **registrar consentimento** para comunicação e processamento de dados.  
- Mascarar/limitar exposição de CPF/telefone em canais públicos.  
- Acesso por função (equipe interna, parceiro, dev) com **RLS** no Supabase.  
- Backups periódicos e versionamento de esquemas/migrações.

---

## 13) Comunicação (tom e estilo)
- Voz **amistosa, profissional e regional (Nordeste)**, evitando termos robóticos.  
- Transparência e acolhimento em primeiro lugar.  
- Emojis ok no WhatsApp; **não** em logs técnicos.  
- Alinhar com o guia `jdcredvip.voice.md` (tom, exemplos, boas práticas).

**Exemplos rápidos**
- “Pronto! Seu contrato foi aprovado — **parabéns** 🎉 Em instantes você recebe os detalhes.”  
- “Estamos quase lá! Falta **só um dado** e eu já finalizo pra você, posso te ajudar agora?”  
- “Parece que este tipo de crédito **não se aplica por enquanto**, mas tenho **outra opção** boa pro seu caso.”

---

## 14) Governança e atualização contínua
- Sempre que houver **mudança de regra** (produto, taxa, faixa de comissão, política de elegibilidade):  
  1) Atualizar este documento;  
  2) Versionar no Git;  
  3) Notificar a equipe;  
  4) Sincronizar com os prompts do agente (supabase/jdcredvip).

**Owner do documento**: Janilson (JD CRED VIP).  
**Contato operacional**: WhatsApp 84 98856-2331.

---

## 15) Apêndice – Mapa rápido de decisão (triagem)
- **INSS**  
  - tem margem? → **Contrato novo INSS**; sem margem? → **Refin** e avaliar **Cartão**.  
  - taxa atual alta? → **Portabilidade** (≥90 dias, CET melhor).  
- **CLT**  
  - saldo FGTS? → **FGTS** + avaliar **CLT Trabalhador**.  
- **Conta de Luz**  
  - tem tarifa social? → **Bolsa Família**; senão, manter **Luz**.  
- **BPC/LOAS**  
  - considerar **INSS** (quando possível) ou **Crédito Pessoal**.  
- **Negativado**  
  - **FGTS**, **Conta de Luz**, **Bolsa Família** (quando elegível).

> **Nota**: regras podem variar com parceiros (BMG, Facta, Crefaz, Crefisa etc.). Sempre validar condições vigentes.

