import React, { useEffect } from "react";

const AiChatbot: React.FC = () => {
  const externalUrl = "https://zmh-chatbot.netlify.app/";

  useEffect(() => {
    // Redirect to external chatbot while the URL briefly shows /ai-chatbot
    globalThis.location.href = externalUrl;
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full py-10">
      <p className="text-lg font-medium mb-2">
        Redirecting you to the AI Assistant...
      </p>
      <a
        href={externalUrl}
        className="text-primary underline"
        target="_blank"
        rel="noreferrer"
      >
        Click here if you are not redirected automatically.
      </a>
    </div>
  );
};

export default AiChatbot;

