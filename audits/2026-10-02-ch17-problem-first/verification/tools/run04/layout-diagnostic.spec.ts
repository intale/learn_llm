import {test} from '@playwright/test';
test('read-only Chapter17 full-view text geometry',async({page})=>{
  await page.setViewportSize({width:1280,height:900});
  await page.goto('/ru/course/17-parameter-initialization/');
  const figure=page.locator('figure[data-visualization-id="parameter-initialization"]');
  await figure.locator('[data-diagram-full-view-toggle]').click();
  await page.waitForFunction(()=>document.fullscreenElement?.getAttribute('data-visualization-id')==='parameter-initialization');
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)});
  const values=await figure.evaluate(node=>{
    const boxes=(selector:string)=>Array.from(node.querySelectorAll<HTMLElement>(selector)).map(x=>({text:x.textContent?.trim(),width:x.getBoundingClientRect().width,height:x.getBoundingClientRect().height,font:getComputedStyle(x).fontSize,line:getComputedStyle(x).lineHeight,children:Array.from(x.children).map(c=>({text:c.textContent?.trim(),width:c.getBoundingClientRect().width,height:c.getBoundingClientRect().height}))}));
    return {summary:boxes('.summary-grid > div'),caption:boxes('figcaption > *'),pairing:boxes('.pairing-note > *'),propagation:boxes('.propagation-section > *'),replay:boxes('.reproducibility-card > *')};
  });
  console.log(JSON.stringify(values));
  console.log(JSON.stringify(await figure.evaluate(node=>{
    const measure=(selector:string,texts:string[])=>{const e=node.querySelector<HTMLElement>(selector)!;const old=e.textContent;const result=texts.map(text=>{e.textContent=text;return {text,height:e.getBoundingClientRect().height}});e.textContent=old;return result};
    return {
      same:measure('.reproduction-same strong',[
        'Ксавье: запрос тот же, веса те же',
        'Те же веса: тот же запрос Ксавье',
        'Тот же запрос Ксавье — те же веса',
      ]),
      different:measure('.reproduction-different strong',[
        'Один запрос Ксавье: разные веса для 17 и 18',
        'Общий запрос Ксавье: разные веса для 17 и 18',
        'Запрос Ксавье тот же: при 17 и 18 веса разные',
        'Ксавье: тот же запрос, веса 17 и 18 различны',
        'Запрос Ксавье тот же: 17 и 18 дают разные веса',
        'Разные веса для 17 и 18: тот же запрос Ксавье',
        'Ксавье: запрос тот же; разные веса при 17 и 18',
      ]),
      oversized:measure('.distribution-oversized strong',[
        'Двойная граница Ксавье; равномерно',
        'Равномерно: граница Ксавье удвоена',
        'Граница Ксавье удвоена; равномерно',
      ]),
      ratio:measure('.pairing-values > div:last-child dt',[
        'Отн. к границе Ксавье',
        'Доля границы Ксавье',
      ]),
      caption:measure('.course-diagram__description',[
        'Гистограммы конечных выборок: нули, равномерные веса с границей Ксавье либо двойной. Дисперсия сигнала ожидается по целевым дисперсиям весов независимых линейных слоёв равной ширины входа/выхода. Веса независимы между собой и от входов; исходные входы независимы. Средние нулевые; дисперсия весов общая, входов единичная.',
        'Гистограммы конечных выборок: нули и равномерные веса с границей Ксавье или двойной. Ожидаемая дисперсия сигнала — по целевым дисперсиям весов. Линейные слои независимы, ширины входа/выхода равны. Веса независимы между собой и от входов; исходные входы независимы. Нулевые средние; дисперсия весов общая, входов единичная.',
        'Конечные выборки: гистограммы нулей и равномерных весов с границей Ксавье или двойной. Ожидаемая дисперсия сигнала — по целевым дисперсиям весов независимых линейных слоёв равной ширины входа/выхода. Веса независимы между собой и от входов; исходные входы независимы. Средние нулевые; дисперсия весов общая, входов единичная.',
      ]),
      propagation:measure('.propagation-section > p',[
        'Теория: дисперсия сигнала по целевой дисперсии весов. Независимые линейные слои: вход/выход одной ширины. Веса независимы между собой и от входов; исходные входы независимы. Средние нулевые; дисперсия весов общая, входов единичная. Не гарантия в нелинейном остаточном декодере.',
        'Теоретическая дисперсия сигнала — по целевой дисперсии весов. Независимые линейные слои: вход/выход одной ширины. Веса независимы между собой и от входов; исходные входы независимы. Средние нулевые; дисперсия весов общая, входов единичная. Не гарантия в нелинейном остаточном декодере.',
        'Ожидаемая дисперсия сигнала по целевой дисперсии весов, не измерение. Линейные слои независимы: вход/выход одной ширины. Веса независимы друг от друга и входов; исходные входы независимы. Средние: ноль; дисперсия весов общая, входов единица. Не гарантия в нелинейном остаточном декодере.',
        'Ожидаемая дисперсия сигнала по целевой дисперсии весов, не измерение. Линейные слои независимы: вход/выход одной ширины. Веса независимы между собой и от входов; исходные входы независимы. Средние: ноль; дисперсия весов общая, входов единица. Не гарантия в нелинейном остаточном декодере.',
        'Дисперсия сигнала ожидается по целевым дисперсиям весов, не измеряется. Линейные слои независимы, ширины входа/выхода равны. Веса независимы между собой и от входов; исходные входы независимы. Нулевые средние; дисперсия весов общая, входов единичная. Не гарантия в нелинейном остаточном декодере.',
        'Ожидаемая, не измеренная дисперсия сигнала — по целевым дисперсиям весов. Независимые линейные слои равной ширины входа/выхода. Веса независимы между собой и от входов; исходные входы независимы. Нулевые средние; дисперсия весов общая, входов единичная. Не гарантия в нелинейном остаточном декодере.',
      ]),
    };
  })));
});
