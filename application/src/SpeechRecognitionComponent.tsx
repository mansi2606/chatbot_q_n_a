
import Button from "./Button";
import Grid from "./Grid";
import { useRef, useState } from "react";
import type React from "react";

interface SpeechRecognitionComponentProps {
  onStart: () => void;
  onSendMessage: (message: string) => void;
}

const SpeechRecognitionComponent: React.FC<SpeechRecognitionComponentProps> = ({
  onStart,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const createRecognizer = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      if (inputText.trim()) {
        onSendMessage(inputText);
        setInputText("");
      }
    };

    recognition.onresult = (event: any) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + " ";
        }
      }
      if (final) setInputText((prev) => prev + final);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event);
      setListening(false);
    };

    return recognition;
  };

  const handleStartStop = () => {
    if (listening) {
      recognitionRef.current?.stop();
    } else {
      onStart();
      if (!recognitionRef.current) {
        recognitionRef.current = createRecognizer();
      }
      recognitionRef.current?.start();
    }
  };

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText("");
    }
  };

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <Grid style={{ position: "relative" }}>
      <input
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleEnter}
        placeholder="Speak or type your question..."
        style={{
          padding: "10px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          fontSize: "16px",
          width: "100%",
          boxSizing: "border-box"
        }}
      />
      <Button
        onClick={
          listening
            ? handleStartStop
            : inputText.trim()
              ? handleSend
              : handleStartStop
        }
        style={{
          position: "absolute",
          right: "0",
          top: "0",
          bottom: "0",
          width: "40px",
          background: "#f5f5f5",
          border: "1px solid #ccc",
          borderLeft: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px"
        }}
        title={listening ? "Stop Listening" : "Start Listening"}
      >
        {listening ? "⏹" : "🎤"}
      </Button>
      {listening && (
        <Grid
          style={{
            position: "absolute",
            right: "50px",
            top: "50%",
            transform: "translateY(-50%)",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: "red"
          }}
          title="Listening"
        />
      )}
    </Grid>
  );
};

export default SpeechRecognitionComponent;
