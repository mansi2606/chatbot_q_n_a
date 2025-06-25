
import React, { useRef, useState } from "react";
import SpeechRecognitionComponent from "./SpeechRecognitionComponent";
import Button from "./Button";
import Grid from "./Grid";
import Typography from "./Typography";

interface Message {
  text: string;
  isUser: boolean;
}

const SpeechPage: React.FC = () => {
  const audioConsentRef = useRef<HTMLAudioElement | null>(null);
  const responseAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState("0:00 / 0:00");
  const [messages, setMessages] = useState<Message[]>([
    {
      text: "Please feel free to ask any queries or questions about the policy covered in the podcast.",
      isUser: false,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleAudioPlay = (): void => {
    if (!isPlaying) {
      setIsPlaying(true);
      audioConsentRef?.current?.play();
    } else {
      setIsPlaying(false);
      audioConsentRef?.current?.pause();
    }
  };

  const handleSpeechStart = (): void => {
    if (isPlaying) {
      setIsPlaying(false);
      audioConsentRef?.current?.pause();
    }
  };

  const handleSendMessage = async (message: string): Promise<void> => {
    if (!message.trim()) return;
    setMessages((prev) => [...prev, { text: message, isUser: true }]);
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/ask/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: message })
      });

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      if (responseAudioRef.current) {
        responseAudioRef.current.src = audioUrl;
        responseAudioRef.current.play();
      }

      const textResponse =
        response.headers.get("X-Response-Text") ??
        "I've processed your request. You can hear my response in the audio.";

      setMessages((prev) => [...prev, { text: textResponse, isUser: false }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { text: "Sorry, there was an error processing your request.", isUser: false }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Grid style={{ padding: "20px", maxWidth: "800px", margin: "0 auto", backgroundColor: "#fcf8f7" }}>
      <Typography style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "10px" }}>
        Finance Simplified - Podcast
      </Typography>
      <Typography style={{ fontSize: "16px", marginBottom: "20px" }}>
        Ask your questions about the policy or the podcast after listening.
      </Typography>

      <Grid style={{ display: "flex", alignItems: "center", marginBottom: "10px" }}>
        <Button onClick={handleAudioPlay} style={{ marginRight: "10px" }}>
          {isPlaying ? "⏸" : "▶"}
        </Button>
        <Typography>{currentTime}</Typography>
      </Grid>

      <audio
        ref={audioConsentRef}
        src="https://www.tataaia.com/content/dam/tataaialifeinsurancecompanylimited/audio/Sell-online-eKYC-Vol-1.mp3"
        onTimeUpdate={() => {
          if (audioConsentRef.current) {
            const current = Math.floor(audioConsentRef.current.currentTime);
            const duration = Math.floor(audioConsentRef.current.duration);
            const format = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;
	    setCurrentTime(`${format(current)} / ${format(duration)}`);
          }
        }}
      />

      <audio ref={responseAudioRef} style={{ display: "flex" }} />

      <Grid style={{ marginTop: "20px", maxHeight: "300px", overflowY: "auto", border: "1px solid #eee", padding: "10px", borderRadius: "4px" }}>
        {messages.map((msg, i) => (
          <Grid key={i} style={{ textAlign: msg.isUser ? "right" : "left", marginBottom: "10px" }}>
            {msg.text}
          </Grid>
        ))}
        {isLoading && <Grid style={{ textAlign: "center", color: "#888" }}>Processing your request...</Grid>}
      </Grid>

      <Grid style={{ marginTop: "20px" }}>
        <SpeechRecognitionComponent
          onStart={handleSpeechStart}
          onSendMessage={handleSendMessage}
        />
      </Grid>
    </Grid>
  );
};

export default SpeechPage;
