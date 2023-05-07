const puppeteer = require("puppeteer");

/**
 * Função para obter o número do mês correspondente em português
 * @param {*} select - o mês a ser convertido em número
 * @returns  - o número do mês correspondente (de 0 a 11)
 */
function getMonth(select) {
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
    if (month_nameBr[i] == select) {
      return i;
    }
  }
  return 0;
}

/**
 * Função assíncrona que faz a busca por ocorrências de um modelo de carro em um mês específico no site motor1.uol.com.br
 * @param {*} model - o modelo de carro a ser procurado
 * @param {*} month - o mês a ser buscado, em português
 * @returns - a quantidade de ocorrências encontradas
 */
async function getOccurrencesMotor1(model, month) {
  // Obtém o número do mês com base no nome passado como parâmetro
  const dataMonth = getMonth(month);

  // Inicia uma instância do navegador com a biblioteca Puppeteer
  const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true, // Ignora erros de HTTPS
    headless: "new", // Executa em modo headless (sem interface gráfica)
    args: [
      "--ignore-certificate-errors", // Ignora erros de certificado SSL
      "--ignore-certificate-errors-spki-list",
    ],
  });

  // Abre uma nova página no navegador
  const page = await browser.newPage();

  const encodedModel = encodeURIComponent(model);
  const searchUrl = `https://motor1.uol.com.br/search/?q=${encodedModel}`;
  console.log(`Procurando por: ${model}`);

  try {
    // Navega para a página de busca do Motor1
    await page.goto(searchUrl);

    // Inicializa contadores
    let count = 0; // Contador de ocorrências
    let previousYearCount = 0; // Contador do número de ocorrências na iteração anterior
    let consecutiveYears = 0; // Contador do número de anos consecutivos em que o modelo foi encontrado

    // Loop infinito para carregar mais resultados
    while (true) {
      // Seleciona todos os elementos do tipo 'date' da página e armazena seus atributos 'data-time' em uma array
      const articleDates = await page.$$eval(".date", (elements) =>
        elements.map((el) => el.getAttribute("data-time"))
      );

      // Loop que percorre todas as datas encontradas
      for (let i = 0; i < articleDates.length; i++) {
        // Converte a data do artigo para um objeto Date
        const articleDate = new Date(parseInt(articleDates[i]) * 1000);
        if (articleDate.getMonth() == dataMonth) {
          // Verifica se o artigo foi publicado no mês especificado
          if (articleDate.getFullYear() < 2023) {
            // Verifica se o artigo foi publicado antes de 2023
            consecutiveYears++;
            if (consecutiveYears >= 1) {
              // Se tiver encontrado artigos nos últimos anos consecutivos especificados, encerra a busca
              await browser.close();
              return count;
            }
          } else {
            consecutiveYears = 0;
            count++;
            previousYearCount = 0;
          }
        }
      }

      const loadMoreButton = await page.$(".btn-more"); // Verifica se há um botão "Carregar mais" na página
      if (!loadMoreButton) {
        // Se não houver mais botão "Carregar mais", encerra a busca
        await browser.close();
        return count;
      }

      // Se a contagem de artigos encontrados for a mesma do ano anterior, encerra a busca
      if (previousYearCount === count) {
        await browser.close();
        return count;
      }

      previousYearCount = count; // Salva a contagem de artigos encontrados para comparar com a do ano anterior
      await loadMoreButton.click(); // Clica no botão "Carregar mais" para carregar mais artigos
      await page.waitForSelector(".news-row .col-md-3"); // Aguarda a carga dos novos artigos
    }
  } catch (error) {
    console.error(error);
    await browser.close();
  }
}

module.exports = {
  getOccurrencesMotor1,
};
