import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Trash2, PenLine, RefreshCw, X, Check, Settings as SettingsIcon } from "lucide-react";
import html2canvas from "html2canvas";

// Types
interface Photo {
	id: string;
	imageSrc: string;
	caption: string;
	date: string;
	isDeveloping: boolean;
	x: number;
	y: number;
	rotation: number;
	zIndex: number;
}

interface AISettings {
	baseUrl: string;
	apiKey: string;
	model: string;
}

const DEFAULT_SETTINGS: AISettings = {
	baseUrl: "https://api.openai.com/v1",
	apiKey: "",
	model: "gpt-4o",
};

const playShutterSound = () => {
	try {
		const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
		if (!AudioContext) return;
		const ctx = new AudioContext();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.type = "square";
		osc.frequency.setValueAtTime(800, ctx.currentTime);
		osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
		gain.gain.setValueAtTime(0.3, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
		osc.start();
		osc.stop(ctx.currentTime + 0.1);
	} catch (e) {
		console.error("Audio error", e);
	}
};

const CAMERA_IMG_URL = "/camera.webp";

export default function App() {
	const [photos, setPhotos] = useState<Photo[]>([]);
	const videoRef = useRef<HTMLVideoElement>(null);

	const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
	const [showSettings, setShowSettings] = useState(false);
	const [highestZ, setHighestZ] = useState(100);

	// Load settings from localStorage
	useEffect(() => {
		const saved = localStorage.getItem("retro-camera-settings");
		if (saved) {
			try {
				setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
			} catch (e) {
				console.error("Failed to parse settings", e);
			}
		}
	}, []);

	const handleSaveSettings = (newSettings: AISettings) => {
		setSettings(newSettings);
		localStorage.setItem("retro-camera-settings", JSON.stringify(newSettings));
		setShowSettings(false);
	};

	// Initialize Camera
	useEffect(() => {
		async function setupCamera() {
			try {
				const mediaStream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "user", width: 640, height: 640 },
				});
				if (videoRef.current) {
					videoRef.current.srcObject = mediaStream;
				}
			} catch (err) {
				console.error("Error accessing camera:", err);
				alert("Could not access camera. Please allow permissions.");
			}
		}
		setupCamera();
	}, []);

	const takePhoto = async () => {
		if (!videoRef.current) return;

		playShutterSound();

		// Capture frame
		const canvas = document.createElement("canvas");
		canvas.width = 480;
		canvas.height = 640; // 3:4 Aspect Ratio roughly
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Draw video to canvas (center crop to keep aspect ratio)
		const video = videoRef.current;
		const vRatio = video.videoWidth / video.videoHeight;
		const cRatio = canvas.width / canvas.height;

		let sx, sy, sWidth, sHeight;
		if (vRatio > cRatio) {
			sHeight = video.videoHeight;
			sWidth = sHeight * cRatio;
			sx = (video.videoWidth - sWidth) / 2;
			sy = 0;
		} else {
			sWidth = video.videoWidth;
			sHeight = sWidth / cRatio;
			sx = 0;
			sy = (video.videoHeight - sHeight) / 2;
		}

		ctx.translate(canvas.width, 0);
		ctx.scale(-1, 1); // Mirror effect
		ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);

		const imageSrc = canvas.toDataURL("image/jpeg", 0.9);

		const newPhoto: Photo = {
			id: Date.now().toString(),
			imageSrc,
			caption: "Developing...",
			date: new Date().toLocaleDateString(),
			isDeveloping: true,
			x: 0,
			y: 0,
			rotation: (Math.random() - 0.5) * 10,
			zIndex: highestZ + 1,
		};

		setHighestZ((prev) => prev + 1);
		setPhotos((prev) => [...prev, newPhoto]);

		// AI Caption Generation
		if (settings.apiKey) {
			generateCaption(newPhoto.id, imageSrc);
		} else {
			updatePhotoCaption(newPhoto.id, "Captured! (Configure AI in Settings)");
		}

		// Finish developing after 3s
		setTimeout(() => {
			setPhotos((prev) => prev.map((p) => (p.id === newPhoto.id ? { ...p, isDeveloping: false } : p)));
		}, 4000);
	};

	const generateCaption = async (photoId: string, imageBase64: string) => {
		try {
			const prompt = `Analyze this photo and generate a very short, warm, handwritten-style blessing or nice comment in the user's language. Keep it under 15 words.`;

			// Construct URL handling potential missing trailing slash
			const baseUrl = settings.baseUrl.replace(/\/+$/, "");
			const url = `${baseUrl}/chat/completions`;

			const response = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${settings.apiKey}`,
				},
				body: JSON.stringify({
					model: settings.model,
					messages: [
						{
							role: "user",
							content: [
								{ type: "text", text: prompt },
								{ type: "image_url", image_url: { url: imageBase64 } },
							],
						},
					],
					max_tokens: 60,
				}),
			});

			const data = await response.json();

			if (data.error) {
				console.error("AI API Error", data.error);
				updatePhotoCaption(photoId, `Error: ${data.error.message || "Check Settings"}`);
				return;
			}

			const text = data.choices?.[0]?.message?.content || "A beautiful moment.";
			updatePhotoCaption(photoId, text.trim());
		} catch (error) {
			console.error("AI Error", error);
			updatePhotoCaption(photoId, "A beautiful moment frozen in time.");
		}
	};

	const updatePhotoCaption = (id: string, caption: string) => {
		setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));
	};

	return (
		<div className="relative w-screen h-screen overflow-hidden bg-gray-100 font-hand text-gray-800 selection:bg-yellow-200">
			{/* Title */}
			<h1 className="absolute top-4 md:top-8 left-1/2 -translate-x-1/2 text-2xl md:text-4xl font-bold tracking-wider text-gray-700 opacity-80 z-10 w-full text-center">Jacob PLD Camera</h1>

			{/* Instructions */}
			<div className="absolute bottom-8 right-8 text-right opacity-60 max-w-xs text-lg pointer-events-none z-0 hidden md:block">
				<p>1. Allow Camera Access</p>
				<p>2. Click the round button to snap</p>
				<p>3. Drag photo to the wall</p>
				<p>4. Hover text to edit or regenerate</p>
			</div>

			{/* Settings Button */}
			<button onClick={() => setShowSettings(true)} className="absolute top-4 right-4 md:top-8 md:right-8 z-40 bg-white p-2 rounded-full shadow-md hover:bg-gray-50 transition-colors text-gray-600" title="AI Settings">
				<SettingsIcon size={20} />
			</button>

			{/* Settings Modal */}
			<AnimatePresence>{showSettings && <SettingsModal settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}</AnimatePresence>

			{/* Photo Wall (Container for dragged photos) */}
			{photos.map((photo) => (
				<PhotoCard key={photo.id} photo={photo} setPhotos={setPhotos} settings={settings} highestZ={highestZ} setHighestZ={setHighestZ} onRegenerate={() => generateCaption(photo.id, photo.imageSrc)} />
			))}

			{/* Camera Container */}
			<div className="fixed z-20 bottom-8 left-1/2 -translate-x-1/2 w-[90vw] max-w-[400px] aspect-square md:w-[450px] md:h-[450px] md:left-16 md:bottom-16 md:translate-x-0">
				{/* Viewfinder Mask */}
				<div
					className="absolute overflow-hidden z-30 pointer-events-none bg-black"
					style={{
						bottom: "32%",
						left: "62%",
						width: "27%",
						height: "27%",
						borderRadius: "50%",
						transform: "translateX(-50%)",
						boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)",
					}}>
					<video
						ref={videoRef}
						autoPlay
						playsInline
						muted
						className="w-full h-full object-cover"
						style={{ transform: "scaleX(-1)" }} // Mirror
					/>
				</div>

				{/* Shutter Button */}
				<div
					onClick={takePhoto}
					className="absolute z-30 rounded-full hover:bg-white/10 active:bg-white/20 transition-colors"
					style={{
						bottom: "40%",
						left: "18%",
						width: "11%",
						height: "11%",
						cursor: "pointer",
					}}
					title="Take Photo"
				/>

				{/* Camera Body Image */}
				<img src={CAMERA_IMG_URL} alt="Retro Camera" className="absolute bottom-0 left-0 w-full h-full object-contain pointer-events-none select-none z-20" />
			</div>
		</div>
	);
}

// --- Subcomponents ---

function SettingsModal({ settings, onSave, onClose }: { settings: AISettings; onSave: (s: AISettings) => void; onClose: () => void }) {
	const [formData, setFormData] = useState(settings);

	return (
		<motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute top-0 left-0 w-full h-full z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
			<div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-full border border-gray-200 font-sans">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold text-gray-800">AI Settings</h2>
					<button onClick={onClose} className="text-gray-400 hover:text-gray-600">
						<X size={20} />
					</button>
				</div>

				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">API Base URL</label>
						<input className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors" value={formData.baseUrl} onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" />
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
						<input type="password" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors" value={formData.apiKey} onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })} placeholder="sk-..." />
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
						<input className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="gpt-4o" />
					</div>
				</div>

				<div className="mt-6 flex justify-end gap-2">
					<button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">
						Cancel
					</button>
					<button onClick={() => onSave(formData)} className="px-4 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 shadow-sm">
						Save Configuration
					</button>
				</div>
			</div>
		</motion.div>
	);
}

function PhotoCard({ photo, setPhotos, settings, highestZ, setHighestZ, onRegenerate }: { photo: Photo; setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>; settings: AISettings; highestZ: number; setHighestZ: React.Dispatch<React.SetStateAction<number>>; onRegenerate: () => void }) {
	const [isEditing, setIsEditing] = useState(false);
	const [editText, setEditText] = useState(photo.caption);
	const cardRef = useRef<HTMLDivElement>(null);

	const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
	const cameraSize = isMobile ? Math.min(window.innerWidth * 0.9, 400) : 450;
	const cameraBottom = isMobile ? 32 : 64;

	const photoWidth = cameraSize * 0.35; // ~157.5px
	const photoHeight = photoWidth * (4 / 3); // ~210px

	// Center X of camera
	const startX = isMobile ? window.innerWidth / 2 - photoWidth / 2 : 64 + cameraSize / 2 - photoWidth / 2;
	// Top of camera
	const startY = window.innerHeight - cameraBottom - cameraSize;

	const handleDownload = async () => {
		if (!cardRef.current) return;
		try {
			const canvas = await html2canvas(cardRef.current, {
				backgroundColor: null,
				scale: 2,
				useCORS: true,
			});
			const link = document.createElement("a");
			link.download = `jacob-pld-${photo.id}.png`;
			link.href = canvas.toDataURL("image/png");
			link.click();
		} catch (e) {
			console.error("Download failed", e);
		}
	};

	const handleDelete = () => {
		setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
	};

	const handleRegenerateClick = async () => {
		if (!settings.apiKey) {
			alert("Please configure API Key in Settings first.");
			return;
		}
		setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, caption: "Regenerating..." } : p)));
		onRegenerate();
	};

	const saveEdit = () => {
		setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, caption: editText } : p)));
		setIsEditing(false);
	};

	return (
		<motion.div
			ref={cardRef}
			drag
			dragMomentum={false}
			whileDrag={{ scale: 1.05, cursor: "grabbing" }}
			onDragStart={() => setHighestZ((h) => h + 1)}
			onMouseDown={() => setHighestZ((h) => h + 1)}
			initial={{
				x: startX,
				y: startY + 100,
				opacity: 0,
				scale: 0.9,
			}}
			animate={{
				x: photo.x || startX,
				y: photo.y || startY - photoHeight * 0.4,
				opacity: 1,
				scale: 1,
				rotate: photo.rotation,
				zIndex: photo.zIndex || highestZ,
			}}
			transition={{
				type: "spring",
				stiffness: 50,
				damping: 15,
				delay: 0.2,
			}}
			className="absolute flex flex-col items-center bg-white p-3 shadow-xl transition-shadow duration-300 hover:shadow-2xl"
			style={{
				width: `${photoWidth}px`,
				minHeight: `${photoHeight + 60}px`,
				paddingBottom: "1rem",
				cursor: "grab",
			}}>
			{/* Photo Area */}
			<div className="w-full relative bg-gray-900 overflow-hidden aspect-[3/4]">
				<img
					src={photo.imageSrc}
					alt="Polaroid"
					className="w-full h-full object-cover transition-all duration-[3000ms] ease-in-out"
					style={{
						filter: photo.isDeveloping ? "blur(20px) grayscale(100%) brightness(1.5)" : "blur(0px) grayscale(0%) brightness(1)",
						opacity: photo.isDeveloping ? 0.8 : 1,
					}}
				/>

				<div className="absolute top-0 left-0 w-full h-full opacity-0 hover:opacity-100 transition-opacity bg-black/10 flex items-start justify-end p-2 gap-2">
					<button onClick={handleDownload} className="bg-white/80 p-1.5 rounded-full hover:bg-white text-gray-800">
						<Download size={14} />
					</button>
					<button onClick={handleDelete} className="bg-white/80 p-1.5 rounded-full hover:bg-red-100 text-red-600">
						<Trash2 size={14} />
					</button>
				</div>
			</div>

			{/* Footer / Caption */}
			<div className="w-full mt-3 px-1 group relative">
				<div className="flex justify-between items-center text-xs text-gray-400 font-sans mb-1">
					<span>{photo.date}</span>
				</div>

				{isEditing ? (
					<div className="flex gap-1">
						<input
							autoFocus
							className="w-full border-b border-gray-300 focus:border-gray-800 outline-none bg-transparent text-lg font-hand leading-tight"
							value={editText}
							onChange={(e) => setEditText(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") saveEdit();
								if (e.key === "Escape") setIsEditing(false);
							}}
						/>
						<button onClick={saveEdit}>
							<Check size={14} className="text-green-600" />
						</button>
					</div>
				) : (
					<div className="relative pr-6">
						<p
							onDoubleClick={() => {
								setIsEditing(true);
								setEditText(photo.caption);
							}}
							className="text-lg leading-tight font-hand text-gray-800 break-words">
							{photo.caption}
						</p>

						<div className="absolute top-0 right-0 hidden group-hover:flex flex-col gap-1">
							<button
								onClick={() => {
									setIsEditing(true);
									setEditText(photo.caption);
								}}
								className="text-gray-400 hover:text-gray-800"
								title="Edit text">
								<PenLine size={14} />
							</button>
							<button onClick={handleRegenerateClick} className="text-gray-400 hover:text-blue-600" title="Regenerate caption">
								<RefreshCw size={14} />
							</button>
						</div>
					</div>
				)}
			</div>
		</motion.div>
	);
}
