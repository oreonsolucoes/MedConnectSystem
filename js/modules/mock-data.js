/* ===================================================================
   Dados simulados (Mock) — extraídos da planilha "Locações CO2 2026"
   Usados quando USE_FIREBASE = false, e também para semear o Firestore.
   =================================================================== */

export const usuarios = [
  { id:"u1", nome:"Vilma",     email:"admin@medconnect.com",     senha:"admin",     perfil:"admin"     },
  { id:"u2", nome:"Roni",      email:"roni@medconnect.com",      senha:"motorista", perfil:"motorista" },
  { id:"u3", nome:"Anderson",  email:"anderson@medconnect.com",  senha:"motorista", perfil:"motorista" }
];

export const clientes = [
  { id:"c1", nome:"Dra Priscila Betoni", doc:"CNPJ", documento:"—", endResidencial:"", endComercial:"Rua República do Iraque, 1280 - Campo Belo - SP",
    voltagem:"220V", espaco:"Sala ampla", restricoes:"", telefone:"(11) 90000-0001", horario:"9h às 20h" },
  { id:"c2", nome:"Jaqueline",           doc:"CPF",  documento:"—", endResidencial:"", endComercial:"Rua Angelo Bianchy, 168 - Centro - Osasco - SP",
    voltagem:"110V", espaco:"Consultório", restricoes:"", telefone:"(11) 90000-0002", horario:"8h às 15h" },
  { id:"c3", nome:"Dra Anna - SBC",      doc:"CNPJ", documento:"—", endResidencial:"", endComercial:"Av. Kennedy, 27 - Sala 41 - São Bernardo do Campo - SP",
    voltagem:"220V", espaco:"Sala 41", restricoes:"Elevador pequeno", telefone:"(11) 90000-0003", horario:"10h às 20h" },
  { id:"c4", nome:"Dra Louise",          doc:"CNPJ", documento:"—", endResidencial:"", endComercial:"Av. Cauaxi, 293 - Sl 2519 - Alphaville - Barueri - SP",
    voltagem:"220V", espaco:"Sala 2519", restricoes:"", telefone:"(11) 90000-0004", horario:"12h às 19h" },
  { id:"c5", nome:"Emilly Lacerda",      doc:"CPF",  documento:"—", endResidencial:"", endComercial:"Av. Francisco Conde, 59 - Vl. Rosália - Guarulhos - SP",
    voltagem:"110V", espaco:"Clínica", restricoes:"", telefone:"(11) 90000-0005", horario:"13h às 19h" },
  { id:"c6", nome:"Laruana",             doc:"CPF",  documento:"—", endResidencial:"", endComercial:"Rua Epaminondas de Oliveira, 112 - Centro - São Roque - SP",
    voltagem:"220V", espaco:"Clínica ampla", restricoes:"", telefone:"(11) 90000-0006", horario:"9h às 21h" }
];

export const motoristas = [
  { id:"m1", nome:"Roni",     contato:"(11) 91111-0001", vinculo:"Fixo",    pin:"1001" },
  { id:"m2", nome:"Anderson", contato:"(11) 91111-0002", vinculo:"Fixo",    pin:"1002" },
  { id:"m3", nome:"Mikael",   contato:"(11) 91111-0003", vinculo:"Avulso",  pin:"1003" },
  { id:"m4", nome:"Bruno",    contato:"(11) 91111-0004", vinculo:"Opção A", pin:"1004" },
  { id:"m5", nome:"Roseli",   contato:"(11) 91111-0005", vinculo:"Opção B", pin:"1005" }
];

export const fornecedores = [
  { id:"f1", nome:"Lasecar Sublocações", contato:"(11) 92222-0001", equipamentos:"Laser CO2, Hipro" },
  { id:"f2", nome:"Bruno Parceiro",      contato:"(11) 92222-0002", equipamentos:"Lavieen, Deep" }
];

export const equipamentos = [
  { id:"e1", serie:"CO2-001", qr:"MC-CO2-001", modelo:"Laser CO2 (Remoção de Tatuagem/Rejuvenescimento)",
    tecnologia:"Laser CO2", frota:"propria", acessorios:"2 sopradores, 2 carregadores, prendedor de braço, óculos branco/preto, mangueira de ar, transformador" },
  { id:"e2", serie:"CO2-002", qr:"MC-CO2-002", modelo:"Laser CO2 (Remoção de Tatuagem/Rejuvenescimento)",
    tecnologia:"Laser CO2", frota:"propria", acessorios:"2 sopradores, 2 carregadores, prendedor de braço, óculos branco/preto, mangueira de ar, transformador" },
  { id:"e3", serie:"QC-101",  qr:"MC-QC-101",  modelo:"Q-Clean (Remoção de Tatuagem)",
    tecnologia:"Qclean", frota:"propria", acessorios:"Óculos IPL/Q-Switched/Long Pulse, lentes Carbon Peel/PMU/1064nm/532nm, folha de protocolo" },
  { id:"e4", serie:"SMT-201", qr:"MC-SMT-201", modelo:"Smart (Depilação/Rejuvenescimento)",
    tecnologia:"Smart", frota:"propria", acessorios:"Ponteira, óculos, cabo, pedal" },
  { id:"e5", serie:"LAV-301", qr:"MC-LAV-301", modelo:"Lavieen (Rejuvenescimento Facial)",
    tecnologia:"Lavieen", frota:"sublocado", fornecedorId:"f2", acessorios:"Kit completo parceiro" }
];

/* Locações — amostra fiel às abas ABRIL/MAIO/JUNHO */
export const locacoes = [
  { id:"l1", data:"2026-04-04", horario:"9h às 20h", periodo:"11h", responsavel:"Rubiana", clienteId:"c1", cliente:"Dra Priscila Betoni",
    endereco:"Rua República do Iraque, 1280 - Campo Belo - SP", equipamentoId:"e4", tecnologia:"Smart",
    tecnica:false, custoTecnica:0, motoristaId:"m1", motorista:"Roni", custoTransporte:240, valorCliente:1000, motoristaCusto:240, statusPgto:"Pago", frota:"propria" },
  { id:"l2", data:"2026-04-04", horario:"8h às 15h", periodo:"7h", responsavel:"Vilma", clienteId:"c2", cliente:"Jaqueline",
    endereco:"Rua Angelo Bianchy, 168 - Centro - Osasco - SP", equipamentoId:"e3", tecnologia:"Qclean",
    tecnica:false, custoTecnica:0, motoristaId:"m1", motorista:"Roni", custoTransporte:200, valorCliente:599.9, motoristaCusto:200, statusPgto:"Pago", frota:"propria" },
  { id:"l3", data:"2026-04-06", horario:"10h às 20h", periodo:"10h", responsavel:"Isaac", clienteId:"c3", cliente:"Dra Anna - SBC",
    endereco:"Av. Kennedy, 27 - Sala 41 - São Bernardo do Campo - SP", equipamentoId:"e4", tecnologia:"Smart",
    tecnica:true, custoTecnica:200, motoristaId:"m1", motorista:"Roni", custoTransporte:240, valorCliente:1400, motoristaCusto:240, statusPgto:"Pago", frota:"propria" },
  { id:"l4", data:"2026-04-09", horario:"12h às 18h40", periodo:"8h", responsavel:"Vilma", clienteId:"c4", cliente:"Dra Louise",
    endereco:"Av. Cauaxi, 293 - Sl 2519 - Alphaville - Barueri - SP", equipamentoId:"e4", tecnologia:"Smart",
    tecnica:false, custoTecnica:0, motoristaId:"m2", motorista:"Anderson", custoTransporte:200, valorCliente:1200, motoristaCusto:200, statusPgto:"Pago", frota:"propria" },
  { id:"l5", data:"2026-05-06", horario:"14h às 20h", periodo:"6h", responsavel:"Rubiana", clienteId:"c5", cliente:"Emilly Lacerda",
    endereco:"Av. Francisco Conde, 59 - Vl. Rosália - Guarulhos - SP", equipamentoId:"e3", tecnologia:"Qclean",
    tecnica:false, custoTecnica:0, motoristaId:"m1", motorista:"Roni", custoTransporte:220, valorCliente:699, motoristaCusto:220, statusPgto:"Pago", frota:"propria" },
  { id:"l6", data:"2026-05-08", horario:"10h às 14h", periodo:"4h", responsavel:"Vilma", clienteId:"c5", cliente:"Aline Olivetto",
    endereco:"Av. Chibarás, 75 - Sl 108 - Moema - SP", equipamentoId:"e5", tecnologia:"Lavieen",
    tecnica:false, custoTecnica:0, motoristaId:"m4", motorista:"Bruno", custoTransporte:560, valorCliente:700, motoristaCusto:560, statusPgto:"Pago", frota:"sublocado" },
  { id:"l7", data:"2026-06-03", horario:"12h às 17h", periodo:"5h", responsavel:"Vilma", clienteId:"c5", cliente:"Bianca Oliveira",
    endereco:"Avenida da Saudades, 3177 - Clínica Olive Place - Cosmópolis - SP", equipamentoId:"e3", tecnologia:"Qclean",
    tecnica:false, custoTecnica:0, motoristaId:"m3", motorista:"Mikael", custoTransporte:602, valorCliente:899, motoristaCusto:602, statusPgto:"A Receber", frota:"propria" },
  { id:"l8", data:"2026-06-08", horario:"9h às 21h", periodo:"12h", responsavel:"Vilma", clienteId:"c6", cliente:"Laruana",
    endereco:"Rua Epaminondas de Oliveira, 112 - Centro - São Roque - SP", equipamentoId:"e1", tecnologia:"Laser CO2",
    tecnica:false, custoTecnica:0, motoristaId:"m3", motorista:"Mikael", custoTransporte:200, valorCliente:1300, motoristaCusto:400, statusPgto:"A Receber", frota:"propria" }
];

export const despesas = [
  { id:"d1", tipo:"Fixa",   descricao:"Contabilidade (CNPJ)",        valor:265,  venc:"2026-06-10" },
  { id:"d2", tipo:"Fixa",   descricao:"Seguro Qclean",               valor:467.06, venc:"2026-06-05" },
  { id:"d3", tipo:"Fixa",   descricao:"Boleto Laser CO2",            valor:6348.8, venc:"2026-06-22" },
  { id:"d4", tipo:"Fixa",   descricao:"Boleto Qclean",               valor:3873.5, venc:"2026-06-16" },
  { id:"d5", tipo:"Avulsa", descricao:"Tráfego pago (anúncios)",     valor:1275,  venc:"2026-06-09" },
  { id:"d6", tipo:"Avulsa", descricao:"Conserto Qclean (Laruana)",   valor:700,   venc:"2026-06-09" }
];

/* Estrutura dos checklists (fiel aos .docx do projeto) */
export const checklistTemplates = {
  "Laser CO2": {
    "Estrutura do Equipamento": ["Carcaça sem avarias","Tela sem trincas","Painel funcionando","Conectores firmes","Ventilação livre"],
    "Lente / Ponteira": ["Lente íntegra","Sem rachaduras","Encaixe firme","Limpeza adequada"],
    "Acessórios Equipamento": ["Cabo de energia original","Pedal funcionando","Fonte/adaptador"],
    "Higienização": ["Equipamento limpo","Sem resíduos","Sem odor","Sem manchas"],
    "Transporte": ["Bolsa","Mesinha com rodinhas"],
    "Teste Funcional": ["Liga normalmente","Inicializa sem erro","Tela responde","Disparo testado"],
    "Acessórios Laser CO2": ["2 Sopradores","2 Carregadores do soprador","Prendedor de braço","1 Óculos branco","1 Óculos preto","1 Mangueira de ar","1 Transformador","Folha de protocolo de tratamentos"]
  },
  "Qclean": {
    "Estrutura do Equipamento": ["Carcaça sem avarias","Tela sem trincas","Painel funcionando","Conectores firmes","Ventilação livre"],
    "Lente / Ponteira": ["Lente íntegra","Sem rachaduras","Encaixe firme","Limpeza adequada"],
    "Acessórios Equipamento": ["Cabo de energia original","Pedal funcionando","Fonte/adaptador"],
    "Higienização": ["Equipamento limpo","Sem resíduos","Sem odor","Sem manchas"],
    "Transporte": ["Bolsa","Mesinha com rodinhas"],
    "Teste Funcional": ["Liga normalmente","Inicializa sem erro","Tela responde","Disparo testado"],
    "Óculos": ["Óculos cedo – Branco","Óculos IPL 190/1800nm","Óculos Q-Switched 190/540nm","Óculos Long Pulse 980/250nm"],
    "Lentes": ["Carbon Peel","PMU","1064nm","532nm","Fracionada","Folha protocolo dos tratamentos"]
  }
};

/* Genérico para tecnologias sem template específico */
export const checklistGenerico = checklistTemplates["Laser CO2"];
