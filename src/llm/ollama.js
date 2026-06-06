import axios from "axios";

export async function askOllama(messages) {
    const response = await axios.post(
        "http://localhost:11434/api/chat",
        {
            model: "gemma4",
            messages,
            stream: false
        }
    );

    return JSON.parse(response.data.message.content);
}