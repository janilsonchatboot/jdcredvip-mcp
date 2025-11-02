# JD CRED VIP – Guia de Análise de Extrato INSS

## Objetivo
Padronizar a leitura de extratos consignados do Meu INSS para identificar oportunidades de portabilidade e refinanciamento automaticamente.

## Etapas da análise
1. **Identificação do cliente**: nome, CPF, data de nascimento, convênio.
2. **Listagem de contratos**: banco, número do contrato, data início/fim, prazo, parcela, valor liberado, saldo.
3. **Margens**: calcular margem comprometida e margem livre a partir das parcelas ativas.
4. **Taxas**: estimar taxa efetiva mensal quando possível (usar campos do extrato + cálculo aproximado).
5. **Situação**: classificar cada contrato em ativo, liquidado, suspenso.

## Critérios de oportunidade
- **Portabilidade sugerida** quando:
  - taxa_juro >= 1.80 % a.m. **ou**
  - banco diferente dos parceiros preferenciais JD CRED VIP;
  - prazo restante > 6 meses;
  - cliente com histórico positivo (sem inadimplência ou atrasos).
- **Refinanciamento vantajoso** quando:
  - contrato ativo no mesmo banco, margem livre > 5 %;
  - parcela atual <= 35 % da renda líquida;
  - cliente aceitou refin prolongado (se informação disponível).
- **Contrato regular** quando:
  - taxa <= 1.40 % a.m. e margem livre < 2 %.

## Prioridade comercial
- **Alta (2)**: portabilidade + margem livre >= 10 %, taxa > 2.0 % a.m.
- **Média (1)**: refinanciamento possível, taxa entre 1.6 % e 2.0 % a.m.
- **Baixa (0)**: contrato regular ou margem livre mínima.

## Regras adicionais
- Sugerir comunicação WhatsApp quando contratação supera R$ 5.000 liberados.
- Registrar justificativa curta (1-2 frases) para cada recomendação.
- Caso PDF esteja ilegível, marcar status "erro" com observação.

## Saída esperada (tabela analise_extrato_inss)
- `recomendacao`: Portabilidade sugerida, Refinanciamento vantajoso, Sem ação, Revisar manualmente.
- `justificativa`: explicação objetiva (ex.: "Taxa 2,15 % a.m. acima da média, margem livre 12 %").
- `prioridade`: 0, 1, 2 conforme critérios.
- `status_analise`: pendente → processando → concluído ou erro.

Este guia deve ser usado pelo handler `extrato-inss` do Codex Agent.
