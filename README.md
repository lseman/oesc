# OESC Dashboard

Dashboard público em português para o Observatório da Economia Espacial Catarinense. HTML, CSS e JavaScript sem etapa de build e sem dependências de runtime.

## Publicação

Site: https://www.laioseman.com/oesc/

Repositório: https://github.com/lseman/oesc

GitHub Pages publica automaticamente a raiz da branch `main`. Os arquivos usam caminhos relativos para funcionar em `/oesc/`.

## Executar

```sh
npm run dev
```

Abra http://localhost:5174. Para verificar a sintaxe: `npm run check`.

## Conteúdo e limites

Fonte: https://oesc.ufsc.br/, consultada em 13/11/2026. O mapa em `assets/mapasc.png` pertence ao site OESC. As fontes Manrope e DM Sans são carregadas do Google Fonts, com fallback local.

Os números são informações publicadas do **projeto**: 48 integrantes, cinco áreas iniciais, seis eixos e horizonte de 26 meses. Não são indicadores do censo. Entregas e fases são explicitamente apresentadas como previstas; não há percentuais de progresso ou contagens regionais inventados. A organização das áreas por upstream, downstream e tecnologias/negócios é editorial. Instituições são as mencionadas no site, não um diretório completo do setor.

Navegação por hash, filtros de áreas, detalhes em diálogos, mapa e lista de regiões, seleção regional, busca por texto sem distinção de acentos (Ctrl/Cmd+K) e exportação JSON funcionam no navegador. Inscrições e participação direcionam para os canais oficiais. A interface é pública e não implementa autenticação, coleta de cadastros ou integração com bases do censo.

O estado de interface é mantido em memória, a seção é refletida na URL e os filtros são derivados das coleções locais. Eventos são registrados uma vez e a busca não envia dados a serviços externos. URLs temporárias de exportação são revogadas e diálogos de detalhes são removidos ao fechar.

**Atlas de Formação**, no menu do painel, abre as visões Cursos e Instituições com dados presenciais do Censo da Educação Superior 2024 em Santa Catarina. A página usa somente arquivos locais e compartilha os filtros entre o mapa, a comparação e os rankings. As fontes, as regras de cálculo e as condições de uso dos derivados estão registradas em [atlas/dados.md](atlas/dados.md).

## Editar o conteúdo

O aplicativo carrega os arquivos abaixo por `fetch`, em paralelo, antes de renderizar. Não há conteúdo de projeto duplicado em JavaScript e não é necessário executar um build. Edite o JSON, faça commit e push em `main`; o GitHub Pages publica os arquivos atualizados.

| Arquivo                   | Conteúdo                                                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `data/project.json`       | Fonte, links oficiais, textos da página inicial e do menu, métricas, mapa, filtros e textos explicativos (`copy`) |
| `data/sections.json`      | Títulos, descrições e ordem das sete seções                                                                       |
| `data/areas.json`         | Áreas de interesse, categorias, descrições e tags                                                                 |
| `data/regions.json`       | Lista de mesorregiões                                                                                             |
| `data/institutions.json`  | Instituições, siglas, descrição e identificação da instituição líder                                              |
| `data/opportunities.json` | Cards de oportunidades, situação e links                                                                          |
| `data/deliverables.json`  | Entregas, descrições e situação prevista                                                                          |
| `data/roadmap.json`       | Fases, janelas de execução e descrições                                                                           |

Por exemplo, para cadastrar uma oportunidade, acrescente um objeto em `data/opportunities.json`:

```json
{
  "label": "CHAMADA",
  "color": "green",
  "status": "Consulte os prazos",
  "title": "Título da oportunidade",
  "description": "Descrição da chamada ou ação.",
  "url": "https://oesc.ufsc.br/oportunidades.html",
  "linkLabel": "Saiba mais"
}
```

Textos são tratados como texto simples: caracteres como `<`, `&` e aspas aparecem literalmente. Para quebras de linha no banner, use os arrays `hero.title` e `hero.description`. Cores disponíveis: `blue`, `purple`, `green`, `orange` e `pink`. Categorias de áreas correspondem aos IDs de `project.filters`; `all` é reservado ao filtro geral. Os IDs das seções identificam páginas da aplicação e devem ser preservados. As métricas `team`, `areas`, `axes` e `duration` são editadas em `project.metrics`; o resumo exportado usa esses mesmos valores. Mantenha a métrica de áreas e os textos explicativos coerentes com suas alterações.

Execute `npm run check` para verificar a sintaxe e validar todos os arquivos de conteúdo. A validação também ocorre no navegador. Em caso de falha de rede, JSON inválido ou formato incompatível, o painel mostra uma mensagem e permite tentar novamente. Listas vazias mostram um estado sem conteúdo. A busca e a exportação usam os dados carregados, sem cópias fixas. Os pedidos usam revalidação de cache e os caminhos são relativos ao módulo, para funcionar também sob `/oesc/`.

Sirva a aplicação por HTTP (`npm run dev`); abrir `index.html` diretamente por `file://` não permite carregar os módulos e os arquivos JSON.

## Levantamento upstream e downstream catarinense

`data/companies.json` contém a pesquisa documental de empresas, marcas, unidades e usuárias industriais com vínculo catarinense. A seção **Rede OESC → Empresas e aplicações** oferece busca por empresa/cidade/tecnologia, filtros de papel, segmento e evidência, fichas de fontes e download integral. **Instituições do projeto** permanece em aba separada.

O catálogo distingue `role` (`upstream`, `research_unit`, `downstream`, `integrator`, `end_user`, `adjacent`) e `status` (`documented`, `historical`, `pending`). `documented` significa evidência pública, não empresa auditada. As métricas de fornecedores documentados excluem usuárias, adjacentes e registros históricos/pendentes. O campo `usageScope` distingue aplicação corporativa, uso local e implantação ainda não comprovada. Contagens são de perfis, não de CNPJs únicos ou da população total do setor.

Cada registro inclui tecnologias, mercados, presença territorial, ressalvas, confiança documental e fontes com título, URL, data e fato sustentado. Marcas adquiridas não são contadas duas vezes. Não se presume filiação ao OESC nem situação cadastral ativa. Edite o arquivo, execute `npm run check` e publique por push em `main`.

O relatório está em [`outputs/downstream-sc.md`](outputs/downstream-sc.md), acompanhado de [`outputs/downstream-sc.provenance.md`](outputs/downstream-sc.provenance.md). A ampliação upstream e aeroespacial está em [`outputs/upstream-sc.md`](outputs/upstream-sc.md). As fontes e os casos pendentes devem ser revalidados antes de produzir indicadores oficiais.

O cruzamento com os oito perfis catarinenses observados no catálogo AEB está em [`outputs/aeb-sc.md`](outputs/aeb-sc.md): cinco inclusões (ESSS, Outer Space, Abiental Geospace, AJXTEC e 4C Innovation), totalizando 48 registros. AJXTEC e 4C permanecem adjacentes pendentes; Outer Space e a infraestrutura de laboratório em Joinville têm ressalva contra dupla contagem. Os dados da AEB são declarados pelas organizações.

## Interface e resumo do catálogo

O [complemento do ecossistema espacial de SC](outputs/complemento-ecossistema-sc.md), incorporado em 14/11/2026, acrescenta 19 perfis e complementa oito existentes: o catálogo passa de 48 para 67 perfis. Formação, infraestrutura e fomento têm papéis próprios, separados dos fornecedores. Cada fonte nova identifica página e referência do documento e distingue consulta externa direta de informação lida apenas no PDF. O [registro de conciliação](outputs/complemento-ecossistema-sc.reconciliation.json) permite revisar as decisões. A aba do catálogo agora se chama **Organizações e aplicações**; a lista de instituições do projeto mantém seu significado original.

O CSV local `catalogo_organizacoes_publicas_2026-11-06.csv` foi conciliado em 14/11/2026: suas 10 linhas representam 9 organizações já presentes, incluindo a duplicata NOR/ORN. Essa conciliação não acrescentou perfis aos 48 então existentes. Veja o [cruzamento e as ressalvas de qualidade](outputs/catalogo-2026-11-06.md) e o [registro estruturado da conciliação](outputs/catalogo-2026-11-06.reconciliation.json).

`modern.css` aplica a identidade visual sobre os componentes de `style.css`, com tipografia ampliada, navegação fixa, cards e filtros responsivos e respeito à preferência por movimento reduzido. Na visão geral, o resumo do ecossistema calcula totais e situação documental diretamente de `data/companies.json`. Os atalhos por papel abrem o catálogo já filtrado, incluindo registros históricos e pendentes. Os números do projeto aparecem em bloco separado dos perfis pesquisados.
