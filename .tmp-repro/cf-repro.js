process.env.NODE_PATH = require('path').join(__dirname, 'node_modules');
require('module').Module._initPaths();
const { ChatOpenAI } = require('@langchain/openai');

async function run(name, opts) {
  const llm = new ChatOpenAI({
    modelName: '@cf/ibm-granite/granite-4.0-h-micro',
    apiKey: 'test-key-00000000000000000000',
    configuration: { baseURL: 'http://127.0.0.1:8124/stream' },
    ...opts,
  });
  const t0 = Date.now();
  try {
    const stream = await llm.stream('prompt');
    let out = '';
    for await (const chunk of stream) out += String(chunk.content ?? chunk);
    console.log(name, '→ OK in', Date.now() - t0 + 'ms', '| text:', JSON.stringify(out.slice(0, 60)));
  } catch (e) {
    console.log(name, '→ THREW in', Date.now() - t0 + 'ms');
    console.log('   ', e.message ? e.message.slice(0, 200) : e);
  }
}

(async () => {
  await run('current (streamUsage default)', {});
  await run('with streamUsage:false      ', { streamUsage: false });
})();