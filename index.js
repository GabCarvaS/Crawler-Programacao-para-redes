// Importa a biblioteca dotenv para carregar as variáveis de ambiente
require("dotenv").config();

// Importa o módulo getOccurrences.js
const Occurrences = require("./getOccurrences.js");

// Importa a biblioteca moment para lidar com datas
const moment = require("moment");

// Importa a biblioteca mongoose para conexão com o MongoDB
const mongoose = require("mongoose");

// Importa a biblioteca node-schedule para agendar tarefas
const schedule = require("node-schedule");

// Variável utilizada para controle de execução da função main()
let cont = 1;

/**
 * Conecta ao banco de dados MongoDB.
 */
mongoose
  .connect(process.env.DATABASE_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Conectado ao MongoDB!");
  })
  .catch((err) => {
    console.error("Erro ao conectar ao MongoDB:", err);
  });

/**
 * Define o schema do modelo Car.
 * O modelo Car armazena as ocorrências de um mês para todos os carros.
 */
const carSchema = new mongoose.Schema(
  {
    mes: String,
    cars: Array,
  },
  { collection: "cars" }
);

/**
 * Cria o modelo Car a partir do schema definido anteriormente.
 */
const CarModel = mongoose.model("Car", carSchema);

/**
 * Define o schema do modelo Model.
 * O modelo Model armazena informações sobre cada carro (marca, modelo, ano, etc).
 */
const modelsSchema = new mongoose.Schema(
  {
    mes: String,
    cars: Array,
  },
  { collection: "models" }
);

/**
 * Cria o modelo Model a partir do schema definido anteriormente.
 */
const Model = mongoose.model("Model", modelsSchema);

/**
 * Função assíncrona para carregar a lista de carros de um determinado mês a partir do modelo Model.
 * @param {string} mes O mês que se deseja carregar a lista de carros.
 * @returns A lista de carros do mês especificado.
 */
async function loadCars(mes) {
  try {
    // Procura por um documento que corresponda ao mês fornecido
    const doc = await Model.findOne({ mes: mes });

    // Se o documento existir, retorna a lista de carros armazenada nele
    if (doc) {
      return doc.cars;
    }
  } catch (err) {
    console.log(err);
  }

  // Se não encontrar o documento, retorna um array vazio
  return [];
}

/**
 * Função para obter o nome do mês anterior ou do mês atual.
 * @param {number} select 0 para o mês atual e 1 para o mês anterior.
 * @returns O nome do mês.
 */
function getMonth(select) {
  const momentHoje = moment();
  let today = "";
  if (select == 0) {
    today = momentHoje.format("MMMM");
  } else if (select == 1) {
    today = momentHoje.subtract(1, "months").format("MMMM");
  }

  const month_namesEn = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month_nameBr = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  for (let i = 0; i < 12; i++) {
    if (month_namesEn[i] == today) {
      return month_nameBr[i];
    }
  }
  return 0;
}

/**
 * Adiciona ou atualiza as informações de carros para o mês fornecido em um documento do MongoDB
 * @param {*} array
 * @param {*} mes
 */
async function saveCars(array, mes) {
  try {
    // Procura por um documento existente que corresponda ao mês fornecido
    const existingDoc = await CarModel.findOne({ mes: mes });

    if (existingDoc) {
      // Se o documento existir, atualiza o campo "cars" com os novos dados
      existingDoc.cars = array;
      await existingDoc.save();

      console.log(`Informações de ${mes} atualizadas com sucesso!`);
    } else {
      // Se o documento não existir, cria um novo documento com os dados fornecidos
      const dataMonth = {
        mes: mes,
        cars: array,
      };
      const carDoc = new CarModel(dataMonth);
      await carDoc.save();

      console.log(`Documento de ${mes} criado com sucesso!`);
    }
  } catch (err) {
    console.log(err);
  }
}

/**
 * Desempenha a lógica de funcionamento da aplicação
 * @returns
 */
async function main() {
  process.title = "Crawler motor1";
  console.log(`Iniciando ${cont}º busca...`);
  cont++;
  // Obtém o mês atual.
  const mes = getMonth(1);

  // Carrega a lista de carros a serem buscados.
  const cars = await loadCars(mes);
  console.log(`Mês: ${mes}`);
  if (cars.length == 0) {
    console.log(`Sem elementos para o mes: ${mes}`);
    return;
  }

  // Divide a lista de carros em blocos de três e executa as buscas em paralelo.
  for (let i = 0; i < cars.length; i += 3) {
    const block = cars.slice(i, i + 3);

    const promises = block.map(async (element) => {
      if (element.modelo !== "") {
        const occurrences = await Occurrences.getOccurrencesMotor1(
          element.modelo,
          mes
        );
        element.qtdOcorrencias = occurrences;
      }
    });

    await Promise.all(promises);
  }
  await saveCars(cars, mes);
}

/**
 * Agenda a função main para ser executada todos os dias 07 às 8h da manhã.
 */
const job = schedule.scheduleJob("0 8 7 * *", async function () {
  await main();
});
