// 创建菜单
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "DeepSeekAssistant",
        title: "DeepSeek Assistant",
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "translateToChinese",
        parentId: "DeepSeekAssistant",
        title: "翻译为中文",
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "translateToEnglish",
        parentId: "DeepSeekAssistant",
        title: "翻译为英文",
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "explain",
        parentId: "DeepSeekAssistant",
        title: "解释",
        contexts: ["selection"]
    });
});

// 通用的流式处理请求方法
function streamFetch (apiUrl, token, model, prompt) {
    const abortController = new AbortController();

    fetch(`${apiUrl}`, {
        method: 'POST',
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            model: model,
            messages: [{ "role": "user", "content": prompt }],
            stream: true  // 开启流式返回
        }),
        signal: abortController.signal  // 传递 AbortSignal
    })
        .then(response => {
            if (!response.body) {
                throw new Error("ReadableStream not supported in this browser.");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            console.log("开始流式读取数据...");

            return new ReadableStream({
                async start (controller) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            console.log("流式数据读取完毕");
                            controller.close();
                            abortStreamFunction = null; // 清空终止函数
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        let lines = buffer.split("\n");
                        buffer = lines.pop();

                        for (const line of lines) {
                            const trimmedLine = line.trim();
                            if (!trimmedLine.startsWith("data:")) continue;
                            try {
                                const jsonData = JSON.parse(trimmedLine.replace(/^data:/, "").trim());
                                if (jsonData.choices && jsonData.choices.length > 0) {
                                    const content = jsonData.choices[0].delta.content;
                                    if (content) {
                                        console.log(content);
                                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                                            chrome.tabs.sendMessage(tabs[0].id, { action: "streamText", text: content });
                                        });
                                    }
                                }
                            } catch (e) {
                                console.log('JSON解析失败，解析内容:', trimmedLine);
                            }
                        }
                        controller.enqueue(value);
                    }
                }
            });
        })
        .catch(error => {
            if (error.name === 'AbortError') {
                console.log('请求已被中止');
            } else {
                console.error("Error during fetch:", error);
            }
            abortStreamFunction = null; // 清空终止函数
        });

    // 返回一个函数，用于中止请求
    return () => {
        abortController.abort();
    };
}

let abortStreamFunction = null; // 用于存储终止函数

// 监听菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
    const selectedText = info.selectionText;

    chrome.storage.sync.get(['apiUrl', 'token', 'model'], (result) => {
        const apiUrl = result.apiUrl || '';
        const token = result.token || '';
        const model = result.model || '';

        console.log("API URL:", apiUrl);
        console.log("Token:", token);
        console.log("Selected Text:", selectedText);

        if (!apiUrl || !token || !model) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: "showConfigWarning", text: "请先配置API URL、Token和模型！" });
            });
            return; // 阻止后续执行
        }

        let action = "";
        if (info.menuItemId === "translateToChinese") {
            action = "直接翻译为中文:";
        } else if (info.menuItemId === "translateToEnglish") {
            action = "直接翻译为英文:";
        } else if (info.menuItemId === "explain") {
            action = "用最简单和容易理解的方式解释这个内容:";
        }

        // 返回终止函数
        abortStreamFunction = streamFetch(apiUrl, token, model, action + selectedText);
    });
});

// 监听来自 content.js 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Received message in background.js:", message);
    if (message.action === "abortStream") {
        console.log('Aborting stream...');
        if (abortStreamFunction) {
            abortStreamFunction(); // 执行终止函数
            abortStreamFunction = null; // 清空终止函数
            console.log("Stream fetch aborted.");
        }
        sendResponse({ status: "success" }); // 返回响应
    }
    return true; // 保持消息端口打开，直到 sendResponse 被调用
});

console.log("DeepSeek Assistant Background service worker is running!");