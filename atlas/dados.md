# Dados do Atlas de Formação Acadêmica

O Atlas usa a dimensão 1 do Censo da Educação Superior 2024 para Santa Catarina. A unidade é a observação presencial no município de oferta, identificada por IES, curso, dimensão e código municipal. A mesma IES pode atuar em mais de um município. Códigos de curso, IES e município são tratados como texto e as chaves são validadas antes do cálculo.

## Proveniência e escopo de uso

| Arquivo local | Origem e edição | Transformação e condição registrada |
| --- | --- | --- |
| `data/atlas/formacao.json` | Inep, Censo da Educação Superior 2024. Observações do catálogo WP-004 v1.0.0 segundo `notas.json` do WP-007 v1.0.0 e regras CINE v1.0.0. Perfis derivados de `ies-presenciais.json` no WP-008. | Seleção das colunas usadas na interface, com códigos CINE, regras, chaves e linhas dos CSVs. Base censitária de acesso público, com atribuição ao Inep. O pacote de origem registra a data e a URL da obtenção original como desconhecidas. Condições específicas de redistribuição do derivado não constam nas entradas. |
| `data/atlas/municipios.geojson` | IBGE, Malha Municipal Digital de SC 2024 e sedes municipais de Localidades do Brasil, Censo Demográfico 2022, conforme `geometria-sc.geojson` do WP-007. | Formatação em uma linha por feição. Códigos, geometrias e sedes preservados do derivado generalizado em WGS 84, para escala estadual. Acesso público e atribuição ao IBGE para uso local. Licenças específicas de ambas as edições seguem sem confirmação. |
| `data/atlas/fontes-geograficas.json` | Metadados v1.0.0 do WP-007 para as duas edições do IBGE. | Cópia íntegra de proveniência, com URLs, hashes dos ZIPs, método de generalização e condição registrada de atribuição e uso local. |

O campo `origem` de `formacao.json` identifica as cópias de entrada e seus SHA-256. Os identificadores e linhas de origem remetem aos cadastros de cursos e IES do catálogo Inep. Os códigos de categoria administrativa e organização acadêmica seguem o dicionário de dados do Censo 2024, aba `cadastro_ies`. As localizações de sedes vêm da segunda edição do IBGE e permanecem como metadados cartográficos do GeoJSON.

## Medidas e cobertura

- A base tem 1.616 observações em 63 municípios e 95 IES, incluindo 16 áreas básicas de ingresso (ABI, `QT_CURSO = 0`). O indicador do Atlas conta observações de oferta e inclui as ABI. Matrículas e concluintes são vínculos registrados. As referências EaD ficam fora do recorte.
- Códigos e rótulos CINE e a classificação foram preservados do WP-007 por observação. A pertinência pode ser direta, habilitadora potencial, não identificada ou indeterminada. As classes decorrem de evidências cadastrais e servem à exploração territorial.
- Para a proporção, os filtros de área CINE, IES, categoria, organização e busca definem o denominador. O seletor de pertinência define o numerador, que conta somente correspondências identificadas. A base inclui observações indeterminadas. A interface expõe as três quantidades.
- A contagem de IES usa os códigos distintos em cada município e deduplica novamente em todo o estado. Os indicadores de docentes em exercício e doutores em exercício se referem ao agregado de toda a IES em 2024, mesmo ao consultar ofertas de um município.
- Valores parciais são a parcela identificada. Zero requer cobertura suficiente para aquele indicador. A interface distingue um zero comprovado, a indeterminação que pode alterar o indicador, a falta de oferta presencial na base municipal e a ausência de observações após aplicar filtros.
