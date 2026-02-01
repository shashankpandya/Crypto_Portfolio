import { useEffect } from 'react';

const ChatWidget = () => {
  useEffect(() => {
    window.widget_chat_config = {
      user_id: "22bd5708-b47f-4d27-a6c1-c80b3c1c4124"
    };

    const script = document.createElement('script');
    script.src = 'https://www.agionic.com/widget/widget.js';
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup if needed
      document.head.removeChild(script);
    };
  }, []);

  return null;
};

export default ChatWidget;