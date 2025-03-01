// 创建菜单
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "DeepSeekAssistant",
        title: "DeepSeek Assistant",
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "translate",
        parentId: "DeepSeekAssistant",
        title: "翻译",
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
function streamFetch(apiUrl, token, model, prompt) {
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
        })
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
            async start(controller) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        console.log("流式数据读取完毕");
                        controller.close();
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
        console.error("Error during fetch:", error);
    });
}

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

        if (info.menuItemId === "translate") {
            streamFetch(apiUrl, token, model, "翻译以下内容为英文：" + selectedText);
        } else if (info.menuItemId === "explain") {
            streamFetch(apiUrl, token, model, "解释一下以下内容：" + selectedText);
        }
    });
});
