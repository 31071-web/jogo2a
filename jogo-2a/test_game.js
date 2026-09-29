const fs = require('fs');

async function test() {
  try {
    const listRes = await fetch('http://127.0.0.1:9222/json/list');
    const tabs = await listRes.json();
    console.log('Tabs available:', tabs.length);
    const tab = tabs.find(t => t.url.includes('localhost:8080')) || tabs[0];
    if (!tab) {
      console.error('No tab found!');
      return;
    }
    console.log('Connecting to tab:', tab.webSocketDebuggerUrl);

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let msgId = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && callbacks.has(data.id)) {
        callbacks.get(data.id)(data);
        callbacks.delete(data.id);
      }
      if (data.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER CONSOLE]', data.params.type, data.params.args.map(a => a.value || a.description));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails);
      }
    };

    await new Promise(resolve => ws.onopen = resolve);

    function send(method, params = {}) {
      return new Promise((resolve) => {
        const id = msgId++;
        callbacks.set(id, resolve);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    // Enable Runtime & Page & DOM
    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    console.log('1. Page loaded, checking title and elements...');
    const evalTitle = await send('Runtime.evaluate', { expression: 'document.title' });
    console.log('Page Title:', evalTitle.result.result.value);

    // Click COMO JOGAR
    console.log('2. Clicking COMO JOGAR...');
    await send('Runtime.evaluate', { expression: 'document.getElementById("btn-how-to-play").click()' });
    await new Promise(r => setTimeout(r, 400));
    const howToPlayVisible = await send('Runtime.evaluate', { expression: '!document.getElementById("modal-howtoplay").classList.contains("hidden")' });
    console.log('Modal Como Jogar visible:', howToPlayVisible.result.result.value);

    // Close Modal
    await send('Runtime.evaluate', { expression: 'document.querySelector("[data-close=\'modal-howtoplay\']").click()' });
    await new Promise(r => setTimeout(r, 400));

    // Click JOGAR
    console.log('3. Clicking JOGAR...');
    await send('Runtime.evaluate', { expression: 'document.getElementById("btn-play-game").click()' });
    await new Promise(r => setTimeout(r, 600));

    // Check game state
    const stateEval = await send('Runtime.evaluate', {
      expression: '({ state: window.game ? window.game.state : "active", hudLevel: document.getElementById("hud-level-badge").innerText, hudWorld: document.getElementById("hud-world-badge").innerText })',
      returnByValue: true
    });
    console.log('Game HUD and State:', stateEval.result.result.value);

    // Take screenshot in Level 1 (Polluted World)
    const shot1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/Users/Aluno/Downloads/jogo-2a/screenshot_fase1_polluted.png', Buffer.from(shot1.result.data, 'base64'));
    console.log('Saved screenshot_fase1_polluted.png');

    // Simulate pressing SHIFT to switch world
    console.log('4. Pressing Shift to toggle world...');
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', windowsVirtualKeyCode: 16, code: 'ShiftLeft', key: 'Shift' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 16, code: 'ShiftLeft', key: 'Shift' });
    await new Promise(r => setTimeout(r, 600));

    const worldEval = await send('Runtime.evaluate', {
      expression: 'document.getElementById("hud-world-badge").innerText',
      returnByValue: true
    });
    console.log('World after Shift:', worldEval.result.result.value);

    // Take screenshot in Level 1 (Sustainable World)
    const shot2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/Users/Aluno/Downloads/jogo-2a/screenshot_fase1_sustainable.png', Buffer.from(shot2.result.data, 'base64'));
    console.log('Saved screenshot_fase1_sustainable.png');

    // Simulate moving player right (D key)
    console.log('5. Moving player right...');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd' });
    await new Promise(r => setTimeout(r, 800));
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd' });

    // Simulate jump (Space)
    console.log('6. Jumping (Space)...');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Space', key: ' ' });
    await new Promise(r => setTimeout(r, 200));
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Space', key: ' ' });
    await new Promise(r => setTimeout(r, 500));

    // Pause test (ESC)
    console.log('7. Pressing ESC to Pause...');
    await send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'Escape', key: 'Escape' });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'Escape', key: 'Escape' });
    await new Promise(r => setTimeout(r, 400));

    const pauseVisible = await send('Runtime.evaluate', {
      expression: '!document.getElementById("screen-pause").classList.contains("hidden")',
      returnByValue: true
    });
    console.log('Pause screen visible:', pauseVisible.result.result.value);

    const shot3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('c:/Users/Aluno/Downloads/jogo-2a/screenshot_pause.png', Buffer.from(shot3.result.data, 'base64'));
    console.log('Saved screenshot_pause.png');

    ws.close();
    console.log('TEST COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test error:', err);
  }
}

test();
