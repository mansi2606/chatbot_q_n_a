import React, { useRef, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Paper,
  IconButton,
  TextField,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Button,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import { v4 as uuidv4 } from 'uuid';

const App = () => {
  const podcastRef = useRef<HTMLAudioElement>(null);
  const responseAudioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);
  const bufferAudioRefs = useRef<HTMLAudioElement[]>([]);

  const [appStarted, setAppStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<{ text: string; isUser: boolean }[]>([
    { text: "Ask any question about the podcast.", isUser: false },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAppStart = () => {
    setAppStarted(true);
    // Optionally prime audio permission
    navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {
      console.warn("Mic permission denied.");
    });
  };

  const togglePodcast = async () => {
    if (!podcastRef.current) return;
    try {
      if (isPlaying) {
        podcastRef.current.pause();
      } else {
        await podcastRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.warn("Autoplay blocked for podcast:", err);
    }
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech Recognition not supported.");
      return;
    }

    if (isPlaying) podcastRef.current?.pause();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";

    recognition.onstart = () => {
      setIsListening(true);
      setInputText("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += text + " ";
        } else {
          interim += text;
        }
      }
      setInputText(finalTranscript + interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (finalTranscript.trim()) {
        setInputText("");
        handleSend(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const handleSend = async (messageOverride?: string) => {
    const query = messageOverride ?? inputText.trim();
    if (!query) return;
  
    setMessages((prev) => [...prev, { text: query, isUser: true }]);
    setInputText("");
    setLoading(true);
  
    try {
      const requestId = uuidv4();
      const startTime = performance.now();
  
      const response = await fetch("http://localhost:8000/ask/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": requestId,
        },
        body: JSON.stringify({ query }),
      });
  
      const mediaSource = new MediaSource();
      const audioUrl = URL.createObjectURL(mediaSource);
      responseAudioRef.current.src = audioUrl;
  
      mediaSource.addEventListener("sourceopen", async () => {
        const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        sourceBuffer.mode = 'sequence';
        const reader = response.body?.getReader();
        if (!reader) return;
      
        const queue = [];
        let processing = false;
      
        const processQueue = () => {
          if (processing || queue.length === 0 || sourceBuffer.updating) return;
          processing = true;
          const chunk = queue.shift();
          sourceBuffer.appendBuffer(chunk);
        };
      
        sourceBuffer.addEventListener("updateend", () => {
          processing = false;
          processQueue();
        });
      
        const readChunk = async () => {
          const { done, value } = await reader.read();
          if (done) {
            mediaSource.endOfStream();
            return;
          }
          queue.push(value);
          processQueue();
          readChunk();
        };
      
        readChunk();
      
        // Start playback after the audio is ready
        responseAudioRef.current.oncanplay = () => {
          try {
            responseAudioRef.current.play().catch(err => console.warn("Autoplay blocked for response audio:", err));
          } catch (err) {
            console.warn("Autoplay blocked for response audio:", err);
          }
        };

        responseAudioRef.current.onended = () => {
          setTimeout(() => {
            try {
              podcastRef.current?.play();
              setIsPlaying(true);
            } catch (err) {
              console.warn("Autoplay failed on podcast resume:", err);
            }
          }, 5000);
        };
      });
  
      const reply =
        response.headers.get("X-Response-Text") ??
        "Here's your answer. Please listen to the audio.";
      setMessages((prev) => [...prev, { text: reply, isUser: false }]);
  
      const endTime = performance.now();
      console.log(`Total fetch time: ${Math.round(endTime - startTime)} ms`);
    } catch (error) {
      console.error("Error during handleSend:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, there was a problem processing your request.",
          isUser: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
};

  

//   const handleSend = async (messageOverride?: string) => {
//     const query = messageOverride ?? inputText.trim();
//     if (!query) return;

//     setMessages((prev) => [...prev, { text: query, isUser: true }]);
//     setInputText("");
//     setLoading(true);


//       // 🔀 Pick a random buffer audio
//     const randomIndex = Math.floor(Math.random() * bufferAudioRefs.current.length);
//     const bufferAudio = bufferAudioRefs.current[randomIndex];

//     try {
//       // ▶️ Play buffer audio
//       bufferAudio.currentTime = 0;
//       await bufferAudio?.play();
//     } catch (err) {
//       console.warn("Buffer audio autoplay blocked:", err);
//     }
   
//     try {

//       // 🔊 Start buffer audio while waiting
//     // if (bufferAudioRef.current) {
//     //   bufferAudioRef.current.currentTime = 0;
//     //   await bufferAudioRef.current.play();
//     // }
//       const requestId = uuidv4();
//       const startTime = performance.now();

//       const response = await fetch("http://localhost:8000/ask/", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "X-Request-ID": requestId,
//         },
//         body: JSON.stringify({ query }),
//       });

//       const mediaSource = new MediaSource();
//       const audioUrl = URL.createObjectURL(mediaSource);

//       responseAudioRef.current.src = audioUrl;

//       mediaSource.addEventListener("sourceopen", async () => {
//         const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg'); // adjust MIME type if needed

//         const reader = response.body?.getReader();
//         if (!reader) return;

//         const appendChunk = async ({ done, value }: ReadableStreamReadResult<Uint8Array>) => {
//           if (done) {
//             mediaSource.endOfStream();
//             return;
//           }
//           sourceBuffer.appendBuffer(value);
//           await new Promise<void>((resolve) => {
//             sourceBuffer.addEventListener("updateend", () => resolve(), { once: true });
//           });
//           reader.read().then(appendChunk);
//         };

//         reader.read().then(appendChunk);
//       });

//       const reply =
//         response.headers.get("X-Response-Text") ??
//         "Here's your answer. Please listen to the audio.";

//       setMessages((prev) => [...prev, { text: reply, isUser: false }]);

//       const endTime = performance.now();
//       console.log(`Total fetch time: ${Math.round(endTime - startTime)} ms`);


//         // ⏹ Stop buffer audio
//       bufferAudio?.pause();
//       bufferAudio.currentTime = 0;
// //      if (responseAudioRef.current) {
// //        responseAudioRef.current.src = audioUrl;
// //        try {
// //          await responseAudioRef.current.play();
// //        } catch (err) {
// //          console.warn("Autoplay blocked for response audio:", err);
// //        }
// //      }
//       if (responseAudioRef.current) {
//   responseAudioRef.current.src = audioUrl;

//       try {
//         await responseAudioRef.current.play();

//         responseAudioRef.current.onended = () => {
//           setTimeout(() => {
//             try {
//               podcastRef.current?.play();
//               setIsPlaying(true);
//             } catch (err) {
//               console.warn("Autoplay failed on podcast resume:", err);
//             }
//           }, 5000); // 🎧 Wait 5 seconds before resuming podcast
//         };
//       } catch (err) {
//         console.warn("Autoplay blocked for response audio:", err);
//       }
//     }

//     } catch (error) {
//       setMessages((prev) => [
//         ...prev,
//         { text: "Sorry, there was a problem processing your request.", isUser: false },
//       ]);
//     } finally {
//       setLoading(false);
//     }
//   };

  // 🔒 Show intro screen until app is interacted with
  if (!appStarted) {
    return (
      <Container sx={{ textAlign: "center", mt: 20 }}>
        <Typography variant="h4" gutterBottom>
          Insurance Simplified
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 600, mx: "auto", mb: 4 }}>
          The one stop shop to enhance your knowledge and understanding of insurance products and
          associated concepts pertaining to the world of Insurance.
        </Typography>
        <Button variant="contained" size="large" onClick={handleAppStart}>
          Start App
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <img src="/logo.jpg" alt="Logo" style={{ width: 100, marginBottom: 16 }} />
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Insurance Simplified
        </Typography>
        <Typography variant="body1" sx={{ color: "#555", maxWidth: "700px", mx: "auto" }}>
          The one stop shop to enhance your knowledge and understanding of insurance products and
          associated concepts pertaining to the world of Insurance
        </Typography>
      </Box>

      <AppBar position="static" sx={{ mt: 4 }}>
        <Toolbar>
          <Typography variant="h6">🎧 Finance Simplified Podcast with hosts Raj and Priya </Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Podcast Player
        </Typography>
        <Box display="flex" alignItems="center" mb={2}>
          <IconButton onClick={togglePodcast}>
            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
          </IconButton>
          <Typography>{isPlaying ? "Playing..." : "Paused"}</Typography>
        </Box>
        <audio ref={podcastRef} src="/podcast.mp3" />
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Assistant
        </Typography>

        <Paper sx={{ maxHeight: 300, overflow: "auto", p: 2, mb: 2 }}>
          <List dense>
            {messages.map((msg, i) => (
              <ListItem key={i} sx={{ justifyContent: msg.isUser ? "flex-end" : "flex-start" }}>
                <ListItemText
                  primary={msg.text}
                  sx={{
                    textAlign: msg.isUser ? "right" : "left",
                    maxWidth: "80%",
                    bgcolor: msg.isUser ? "#e3f2fd" : "#fff3e0",
                    p: 1,
                    borderRadius: 2,
                  }}
                />
              </ListItem>
            ))}
            {loading && (
              <ListItem>
                <ListItemText primary={<CircularProgress size={20} />} />
              </ListItem>
            )}
          </List>
        </Paper>

        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your question..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <IconButton color="primary" onClick={isListening ? stopListening : startListening}>
            {isListening ? <StopIcon /> : <MicIcon />}
          </IconButton>
          <Button variant="contained" onClick={() => handleSend()}>
            Send
          </Button>
        </Box>
        <audio ref={responseAudioRef} style={{ display: "none" }} />
      </Box>
      {/* {["/audio1.mp3", "/audio2.mp3", "/audio3.mp3"].map((src, i) => (
        <audio
        key={i}
        ref={(el) => {
          if (el) bufferAudioRefs.current[i] = el;
        }}
        src={src}
        style={{ display: "none" }}
      />
      ))} */}
      
    </Container>
  );
};

export default App;
