import { ModeloContrato, CampoContrato } from '@/types';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

export async function seedModelosContrato() {
  const modeloRepo = repositoryFactory.getModeloContratoRepository();
  
  const modelos: Omit<ModeloContrato, 'id' | 'dataCadastro' | 'dataAtualizacao'>[] = [
    {
      nome: 'Contrato Click-se Fotos Instantâneas',
      descricao: 'Modelo baseado no contrato padrão Click-se para totens fotográficos',
      ativo: true,
      template: `
<h1 style="text-align: center; margin-bottom: 30px; font-size: 18px; font-weight: bold;">CONTRATO CLICK-SE FOTOS INSTANTÂNEAS</h1>

<p style="margin-bottom: 10px;">
  <strong>CONTRATANTE:</strong> {{nome_contratante}} CPF: {{cpf_contratante}} CEL: {{telefone_contratante}} E-mail: {{email_contratante}}<br>
  <strong>ENDEREÇO:</strong> {{endereco_contratante}} CEP: {{cep_contratante}}
</p>

<p style="margin-bottom: 20px;">
  <strong>CONTRATADO:</strong> {{nome_fantasia}}, CNPJ: {{cnpj}}, Localizado na {{endereco_empresa}}.
</p>

<p style="margin-bottom: 20px; text-align: justify;">
  Pelo presente instrumento particular de Contrato de Prestação de Serviços, as partes acima qualificadas têm entre si justas e avençadas o seguinte:
</p>

<h2 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: bold;">CLÁUSULA PRIMEIRA - DO OBJETO</h2>
<p style="margin-bottom: 15px; text-align: justify;">
  Fica a CONTRATADA responsável pela reserva e entrega para locação de um Totem fotográfico de propriedade da CONTRATADA, para uso e gozo pela CONTRATANTE no Evento citado neste documento, o qual será acompanhado dos seguintes serviços: {{servicos_incluidos}}. Durante todo o período contratado, será impressa 1 (uma) foto para cada pessoa que estiver registrada em cada foto tirada através do Totem lambe-lambe. {{#if album_assinaturas}}Álbum de assinaturas, de folhas pretas, estilo scrapbook, sendo disponibilizado em local de fácil acesso.{{/if}}
</p>

<h2 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: bold;">CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES DA CONTRATANTE</h2>
<p style="margin-bottom: 15px; text-align: justify;">
  A CONTRATANTE deverá (i) disponibilizar à CONTRATADA um ponto de energia elétrica {{tensao_eletrica}} e um espaço útil coberto de {{espaco_util}}m² para montagem e estrutura do Totem. (ii) Não sublocar, ceder ou transferir a locação do equipamento. (iii) Efetuar, às suas expensas, no valor do orçamento apresentado pela CONTRATADA, os reparos por quaisquer danos causados ao Totem durante o Evento, seja males causados por prepostos da CONTRATANTE, usuários ou terceiros.
</p>

<h2 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: bold;">CLÁUSULA TERCEIRA – DA REMUNERAÇÃO</h2>
<p style="margin-bottom: 15px; text-align: justify;">
  O pagamento da quantia de <strong>{{valor_total_formatado}} ({{valor_total_extenso}})</strong> será efetuado pela CONTRATANTE da seguinte forma: {{forma_pagamento}}. É dever do CONTRATANTE efetuar o pagamento integral no prazo estipulado, mesmo se não cobrado ou lembrado pelo CONTRATADO.
</p>

<h2 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: bold;">CLÁUSULA QUARTA – DA VIGÊNCIA</h2>
<p style="margin-bottom: 15px; text-align: justify;">
  O presente contrato é válido até a data do evento {{data_evento}}, passando a vigorar imediatamente após assinatura de ambas as partes neste. A prestação do serviço terá duração de {{duracao_servico}} horas ininterruptas, com início às {{horario_inicio}} e término às {{horario_termino}}, tendo como local de realização o {{local_evento}}. Caso haja atraso para o início do evento, levando em consideração o horário previamente informado pela CONTRATANTE, o CONTRATADO terá uma tolerância máxima de {{tolerancia_atraso}} minutos para início do serviço.
</p>

<h2 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: bold;">CLÁUSULA QUINTA – DA RESCISÃO</h2>
<p style="margin-bottom: 15px; text-align: justify;">
  O presente contrato poderá ser rescindido por qualquer uma das partes, mediante notificação a outra por escrito com prazo mínimo de {{prazo_rescisao}} dias de antecedência. Caso o CONTRATANTE desista da prestação do serviço, {{condicoes_desistencia}}.
</p>
<p style="margin-bottom: 15px; text-align: justify;">
  Na impossibilidade do CONTRATADO realizar o evento, o mesmo devolverá o valor integral das parcelas pagas. Em caso de furtuito ou força maior, a prestação do serviço poderá ser reagendada de acordo com a disponibilidade do CONTRATADO.
</p>
<p style="margin-bottom: 10px; text-align: justify;">
  <strong>Parágrafo 1°</strong> - O contrato também poderá ser rescindido em caso de violação de quaisquer das cláusulas deste contrato, pela parte prejudicada, mediante denúncia imediata, sem prejuízo de eventual indenização cabível.
</p>
<p style="margin-bottom: 15px; text-align: justify;">
  <strong>Parágrafo 2°</strong> - Qualquer tolerância das partes quanto ao descumprimento das cláusulas do presente contrato constituirá mera liberalidade, não configurando renúncia ou novação do contrato ou de suas cláusulas que poderão ser exigidos a qualquer tempo.
</p>

<h2 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: bold;">CLÁUSULA SEXTA – DO REGIME JURÍDICO</h2>
<p style="margin-bottom: 15px; text-align: justify;">
  As partes declaram não haver vínculo empregatício, tendo o CONTRATADO plena autonomia na prestação dos serviços. O CONTRATADO responde exclusivamente por eventual imprudência, negligência, imperícia ou dolo na execução dos serviços que venham a causar qualquer dano à CONTRATANTE ou a terceiros, devendo responder regressivamente caso a CONTRATANTE seja responsabilizada judicialmente por tais fatos, desde que haja a denunciação de lide, salvo no caso de conduta da própria CONTRATANTE contrária à orientação dada pelo CONTRATADO.
</p>
<p style="margin-bottom: 15px; text-align: justify;">
  <strong>Parágrafo único</strong> – Tendo em vista a importância da responsabilidade técnica assumida, o CONTRATADO deverá fazer por escrito suas orientações à CONTRATANTE e aos prepostos, mediante protocolo de recebimento ou ciência.
</p>

<h2 style="margin-top: 20px; margin-bottom: 10px; font-size: 14px; font-weight: bold;">CLÁUSULA SÉTIMA – DO FORO DE ELEIÇÃO</h2>
<p style="margin-bottom: 20px; text-align: justify;">
  As partes elegem o foro de {{foro_eleito}}, para qualquer demanda judicial relativa ao presente contrato, com exclusão de qualquer outro.
</p>

<p style="margin-bottom: 20px; text-align: justify;">
  E por estarem justas e contratadas, na melhor forma de direito, as partes assinam o presente instrumento em 02 (duas) vias originais e de igual teor e forma, na presença das testemunhas que também o assinam, dando tudo por bom, firme e valioso.
</p>

<p style="margin-bottom: 30px; text-align: center;">
  {{cidade_empresa}}, {{data_contrato}}.
</p>

<div style="margin-top: 60px; display: flex; justify-content: space-between;">
  <div style="text-align: center; width: 45%;">
    <p style="border-top: 1px solid #000; padding-top: 5px; margin-top: 50px;">Contratante:________________________________________</p>
    <p style="margin-top: 5px;"><strong>{{nome_contratante}}</strong></p>
  </div>
  <div style="text-align: center; width: 45%;">
    <p style="border-top: 1px solid #000; padding-top: 5px; margin-top: 50px;">Contratado: _____________________________________________</p>
    <p style="margin-top: 5px;"><strong>{{nome_fantasia}}</strong></p>
  </div>
</div>
      `,
      campos: [
        { id: '1', chave: 'nome_contratante', label: 'Nome do Contratante', tipo: 'text', obrigatorio: true, ordem: 1 },
        { id: '2', chave: 'cpf_contratante', label: 'CPF do Contratante', tipo: 'text', obrigatorio: true, ordem: 2 },
        { id: '3', chave: 'telefone_contratante', label: 'Telefone/Celular do Contratante', tipo: 'text', obrigatorio: true, ordem: 3 },
        { id: '4', chave: 'email_contratante', label: 'E-mail do Contratante', tipo: 'text', obrigatorio: true, ordem: 4 },
        { id: '5', chave: 'endereco_contratante', label: 'Endereço Completo do Contratante', tipo: 'text', obrigatorio: true, ordem: 5 },
        { id: '6', chave: 'cep_contratante', label: 'CEP do Contratante', tipo: 'text', obrigatorio: true, ordem: 6 },
        { id: '7', chave: 'nome_fantasia', label: 'Nome Fantasia da Empresa', tipo: 'text', obrigatorio: true, ordem: 7 },
        { id: '8', chave: 'cnpj', label: 'CNPJ da Empresa', tipo: 'text', obrigatorio: true, ordem: 8 },
        { id: '9', chave: 'endereco_empresa', label: 'Endereço Completo da Empresa', tipo: 'text', obrigatorio: true, ordem: 9 },
        { id: '10', chave: 'servicos_incluidos', label: 'Serviços Incluídos', tipo: 'textarea', obrigatorio: true, ordem: 10 },
        { id: '11', chave: 'tensao_eletrica', label: 'Tensão Elétrica (110v/220v)', tipo: 'text', obrigatorio: true, ordem: 11 },
        { id: '12', chave: 'espaco_util', label: 'Espaço Útil (m²)', tipo: 'number', obrigatorio: true, ordem: 12 },
        { id: '13', chave: 'valor_total_formatado', label: 'Valor Total Formatado', tipo: 'currency', obrigatorio: true, ordem: 13 },
        { id: '14', chave: 'valor_total_extenso', label: 'Valor Total por Extenso', tipo: 'text', obrigatorio: true, ordem: 14 },
        { id: '15', chave: 'forma_pagamento', label: 'Forma de Pagamento', tipo: 'textarea', obrigatorio: true, ordem: 15 },
        { id: '16', chave: 'data_evento', label: 'Data do Evento', tipo: 'date', obrigatorio: true, ordem: 16 },
        { id: '17', chave: 'duracao_servico', label: 'Duração do Serviço (horas)', tipo: 'number', obrigatorio: true, ordem: 17 },
        { id: '18', chave: 'horario_inicio', label: 'Horário de Início', tipo: 'text', obrigatorio: true, ordem: 18 },
        { id: '19', chave: 'horario_termino', label: 'Horário de Término', tipo: 'text', obrigatorio: true, ordem: 19 },
        { id: '20', chave: 'local_evento', label: 'Local do Evento', tipo: 'text', obrigatorio: true, ordem: 20 },
        { id: '21', chave: 'tolerancia_atraso', label: 'Tolerância para Atraso (minutos)', tipo: 'number', obrigatorio: false, ordem: 21 },
        { id: '22', chave: 'prazo_rescisao', label: 'Prazo para Rescisão (dias)', tipo: 'number', obrigatorio: false, ordem: 22 },
        { id: '23', chave: 'condicoes_desistencia', label: 'Condições de Desistência', tipo: 'textarea', obrigatorio: false, ordem: 23 },
        { id: '24', chave: 'foro_eleito', label: 'Foro de Eleição', tipo: 'text', obrigatorio: false, ordem: 24 },
        { id: '25', chave: 'cidade_empresa', label: 'Cidade da Empresa', tipo: 'text', obrigatorio: true, ordem: 25 },
        { id: '26', chave: 'data_contrato', label: 'Data do Contrato', tipo: 'date', obrigatorio: true, ordem: 26 },
        { id: '27', chave: 'album_assinaturas', label: 'Incluir Álbum de Assinaturas', tipo: 'text', obrigatorio: false, ordem: 27 }
      ] as CampoContrato[]
    },
    {
      nome: 'Contrato de Prestação de Serviços - Eventos',
      descricao: 'Modelo completo para prestação de serviços em eventos',
      ativo: true,
      template: `
<h1 style="text-align: center; margin-bottom: 30px;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>

<p style="text-align: center; margin-bottom: 40px;">
  <strong>Nº {{numero_contrato}}</strong>
</p>

<h2>PARTES CONTRATANTES</h2>

<p>
  <strong>CONTRATANTE:</strong> {{nome_contratante}}<br>
  <strong>CPF/CNPJ:</strong> {{cpf_contratante}}<br>
  <strong>ENDEREÇO:</strong> {{endereco_contratante}}<br>
  <strong>CEP:</strong> {{cep_contratante}}<br>
  <strong>TELEFONE:</strong> {{telefone_contratante}}<br>
  <strong>E-MAIL:</strong> {{email_contratante}}
</p>

<p>
  <strong>CONTRATADO:</strong> {{razao_social}}<br>
  <strong>NOME FANTASIA:</strong> {{nome_fantasia}}<br>
  <strong>CNPJ:</strong> {{cnpj}}<br>
  <strong>INSCRIÇÃO ESTADUAL:</strong> {{inscricao_estadual}}<br>
  <strong>ENDEREÇO:</strong> {{endereco_empresa}}<br>
  <strong>BAIRRO:</strong> {{bairro_empresa}}<br>
  <strong>CIDADE:</strong> {{cidade_empresa}} - {{estado_empresa}}<br>
  <strong>CEP:</strong> {{cep_empresa}}<br>
  <strong>TELEFONE:</strong> {{telefone_empresa}}<br>
  <strong>E-MAIL:</strong> {{email_empresa}}
</p>

<h2>OBJETO</h2>
<p>
  O presente contrato tem por objeto a prestação de serviços de {{tipo_servico}} para o evento "{{nome_evento}}", a ser realizado em {{data_evento}}, no local {{local_evento}}, situado em {{endereco_evento}}.
</p>

<h2>VALOR E FORMA DE PAGAMENTO</h2>
<p>
  O valor total do contrato é de <strong>{{valor_total_formatado}}</strong>, que será pago da seguinte forma: {{forma_pagamento}}.
</p>

{{#if banco}}
<p>
  <strong>DADOS BANCÁRIOS PARA PAGAMENTO:</strong><br>
  Banco: {{banco}}<br>
  Agência: {{agencia}}<br>
  Conta: {{conta}}<br>
  Tipo: {{tipo_conta}}<br>
  {{#if pix}}PIX: {{pix}}{{/if}}
</p>
{{/if}}

<h2>CONDIÇÕES GERAIS</h2>
<p>
  {{condicoes_gerais}}
</p>

<h2>OBSERVAÇÕES</h2>
<p>
  {{observacoes}}
</p>

<h2>CLÁUSULA SÉTIMA – DO FORO DE ELEIÇÃO</h2>
<p>
  As partes elegem o foro de {{foro_eleito}}, para qualquer demanda judicial relativa ao presente contrato, com exclusão de qualquer outro.
</p>

<p>
  E por estarem justas e contratadas, na melhor forma de direito, as partes assinam o presente instrumento em 02 (duas) vias originais e de igual teor e forma, na presença das testemunhas que também o assinam, dando tudo por bom, firme e valioso.
</p>

<div style="margin-top: 60px; display: flex; justify-content: space-between;">
  <div style="text-align: center;">
    <p>_________________________________</p>
    <p><strong>{{nome_contratante}}</strong></p>
    <p>CONTRATANTE</p>
  </div>
  <div style="text-align: center;">
    <p>_________________________________</p>
    <p><strong>{{razao_social}}</strong></p>
    <p>CONTRATADO</p>
  </div>
</div>

<p style="text-align: center; margin-top: 40px;">
  {{cidade_empresa}}, {{data_contrato}}
</p>
      `,
      campos: [
        { id: '1', chave: 'nome_contratante', label: 'Nome do Contratante', tipo: 'text', obrigatorio: true, ordem: 1 },
        { id: '2', chave: 'cpf_contratante', label: 'CPF/CNPJ do Contratante', tipo: 'text', obrigatorio: true, ordem: 2 },
        { id: '3', chave: 'endereco_contratante', label: 'Endereço do Contratante', tipo: 'text', obrigatorio: true, ordem: 3 },
        { id: '4', chave: 'cep_contratante', label: 'CEP do Contratante', tipo: 'text', obrigatorio: false, ordem: 4 },
        { id: '5', chave: 'telefone_contratante', label: 'Telefone do Contratante', tipo: 'text', obrigatorio: false, ordem: 5 },
        { id: '6', chave: 'email_contratante', label: 'E-mail do Contratante', tipo: 'text', obrigatorio: false, ordem: 6 },
        { id: '7', chave: 'tipo_servico', label: 'Tipo de Serviço', tipo: 'text', obrigatorio: true, ordem: 7 },
        { id: '8', chave: 'nome_evento', label: 'Nome do Evento', tipo: 'text', obrigatorio: true, ordem: 8 },
        { id: '9', chave: 'data_evento', label: 'Data do Evento', tipo: 'date', obrigatorio: true, ordem: 9 },
        { id: '10', chave: 'local_evento', label: 'Local do Evento', tipo: 'text', obrigatorio: true, ordem: 10 },
        { id: '11', chave: 'endereco_evento', label: 'Endereço do Evento', tipo: 'text', obrigatorio: true, ordem: 11 },
        { id: '12', chave: 'valor_total_formatado', label: 'Valor Total (Formatado)', tipo: 'currency', obrigatorio: true, ordem: 12 },
        { id: '13', chave: 'forma_pagamento', label: 'Forma de Pagamento', tipo: 'text', obrigatorio: true, ordem: 13 },
        { id: '14', chave: 'condicoes_gerais', label: 'Condições Gerais', tipo: 'textarea', obrigatorio: false, ordem: 14 },
        { id: '15', chave: 'observacoes', label: 'Observações', tipo: 'textarea', obrigatorio: false, ordem: 15 },
        { id: '16', chave: 'data_contrato', label: 'Data do Contrato', tipo: 'date', obrigatorio: true, ordem: 16 }
      ] as CampoContrato[]
    }
  ];

  for (const modelo of modelos) {
    const existente = await modeloRepo.findAll();
    const jaExiste = existente.some(m => m.nome === modelo.nome);
    
    if (!jaExiste) {
      await modeloRepo.create({
        ...modelo,
        dataCadastro: new Date(),
        dataAtualizacao: new Date()
      });
      console.log(`Modelo "${modelo.nome}" criado`);
    }
  }
}

