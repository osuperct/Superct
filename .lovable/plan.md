# Organizar a área do responsável

## O que será alterado
- Reorganizar a tela nesta ordem: **Conectado como**, **Quadro de avisos**, **Mensalidade**, **Frequência — lista de chamada** e **Documentos do aluno**.
- Transformar cada assunto em uma aba recolhida que abre ao toque, mantendo somente um bloco visual por assunto.
- Mostrar nos avisos um contador piscante quando houver mensagens não lidas; tocar no tópico abre a lista.
- Destacar **EM ATRASO !** e o botão **PAGAR** com uma animação piscante enquanto houver mensalidade vencida.
- Destacar o tópico **Mensalidade !** quando qualquer aluno estiver em atraso.
- Destacar **Documentos do aluno** quando houver arquivo novo liberado pelo professor, até o responsável abrir esse tópico.
- Preservar avaliações e acessos de professor/ADM existentes, apenas reposicionando os assuntos pedidos.

## Detalhes técnicos
- Usar o componente de acordeão já existente e os tokens visuais atuais.
- Reaproveitar a leitura de avisos já lidos e guardar localmente a última visualização dos documentos por responsável.
- Fazer os componentes de avisos e mensalidade informarem seus contadores/alertas ao painel principal.
- Respeitar redução de movimento do aparelho e validar a tela no celular.
