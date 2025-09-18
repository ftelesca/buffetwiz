# Funções de Cálculo de Custos no BuffetWiz

O sistema BuffetWiz possui funções específicas no banco de dados Supabase para calcular custos de receitas e eventos. Essas funções devem ser usadas sempre que necessário consultar custos precisos.

## Funções Disponíveis

### 1. `calculate_recipe_base_cost(recipe_id)`
- **Descrição**: Calcula o custo base de uma receita somando todos os ingredientes/itens utilizados
- **Parâmetro**: `recipe_id` (bigint) - ID da receita
- **Retorno**: `numeric` - Custo base total da receita
- **Uso**: Para obter o custo bruto dos ingredientes de uma receita

**Exemplo SQL**:
```sql
SELECT description, calculate_recipe_base_cost(id) as custo_base 
FROM recipe 
WHERE id = 123;
```

### 2. `calculate_recipe_unit_cost(recipe_id)`
- **Descrição**: Calcula o custo unitário de uma receita considerando a eficiência/rendimento
- **Parâmetro**: `recipe_id` (bigint) - ID da receita  
- **Retorno**: `numeric` - Custo unitário da receita
- **Uso**: Para obter o custo real por unidade considerando perdas e eficiência

**Exemplo SQL**:
```sql
SELECT description, calculate_recipe_unit_cost(id) as custo_unitario 
FROM recipe 
WHERE id = 123;
```

### 3. `calculate_event_cost(event_id)`
- **Descrição**: Calcula e atualiza o custo total de um evento baseado em todas as receitas do menu
- **Parâmetro**: `event_id` (bigint) - ID do evento
- **Retorno**: `numeric` - Custo total do evento
- **Uso**: Para obter o custo total de produção de um evento

**Exemplo SQL**:
```sql
SELECT title, calculate_event_cost(id) as custo_total 
FROM event 
WHERE id = 456;
```

## Como Usar no Chat AI

Quando o usuário perguntar sobre custos de receitas ou eventos, você deve:

1. **Para custos de receitas individuais**: Use `calculate_recipe_unit_cost()`
2. **Para custo base sem considerar eficiência**: Use `calculate_recipe_base_cost()`  
3. **Para custos de eventos completos**: Use `calculate_event_cost()`

### Exemplo de Query Completa para Análise:

```sql
-- Análise completa de custos de receitas
SELECT 
    r.description as receita,
    r.efficiency as eficiencia,
    calculate_recipe_base_cost(r.id) as custo_base,
    calculate_recipe_unit_cost(r.id) as custo_unitario,
    (calculate_recipe_unit_cost(r.id) - calculate_recipe_base_cost(r.id)) as diferenca_eficiencia
FROM recipe r 
WHERE r.user_id = auth.uid()
ORDER BY custo_unitario DESC;
```

## Importante

- Essas funções já consideram todos os cálculos automaticamente
- Não é necessário fazer cálculos manuais de custos
- As funções já estão otimizadas e incluem tratamento de valores nulos
- Use sempre essas funções para garantir precisão nos cálculos

## Triggers Automáticos

O sistema possui triggers que atualizam automaticamente os custos quando:
- Preços de itens são alterados
- Receitas são modificadas  
- Itens são adicionados/removidos de receitas
- Menus de eventos são alterados

Isso garante que os custos estejam sempre atualizados sem necessidade de recálculo manual.