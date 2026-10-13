import {
	Badge,
	Button,
	Callout,
	Dialog,
	Flex,
	ScrollArea,
	Table,
	Text,
	TextField,
} from "@radix-ui/themes";
import { useAtom, useSetAtom, useStore } from "jotai";
import { type FC, useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { uid } from "uid";
import { audioEngine } from "$/modules/audio/audio-engine";
import { ttmlToAmll } from "$/modules/ttml-processor";
import { parseLrc } from "$/utils/parse-lrc";
import {
	activeServerTrackIdAtom,
	musicServerUrlAtom,
	serverSyncDialogAtom,
} from "$/states/dialogs";
import {
	newLyricLinesAtom,
	projectIdAtom,
	saveFileNameAtom,
} from "$/states/main";
import type { TTMLLyric } from "$/types/ttml";

export const ServerSyncModal: FC = () => {
	const [opened, setOpened] = useAtom(serverSyncDialogAtom);
	const [serverUrl, setServerUrl] = useAtom(musicServerUrlAtom);
	const [activeTrackId, setActiveTrackId] = useAtom(activeServerTrackIdAtom);
	const setNewLyricLines = useSetAtom(newLyricLinesAtom);
	const setProjectId = useSetAtom(projectIdAtom);
	const setSaveFileName = useSetAtom(saveFileNameAtom);

	const [isConnecting, setIsConnecting] = useState(false);
	const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);
	const [tracks, setTracks] = useState<any[]>([]);
	const [searchFilter, setSearchFilter] = useState("");
	const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

	const cleanUrl = useCallback((raw: string) => {
		let u = (raw || "").trim();
		if (!u.startsWith("http://") && !u.startsWith("https://")) {
			u = `http://${u}`;
		}
		return u.replace(/\/+$/, "");
	}, []);

	const loadLibrary = useCallback(async () => {
		const url = cleanUrl(serverUrl || "http://localhost:8000");
		setIsConnecting(true);
		setStatusMsg(null);
		try {
			const res = await fetch(`${url}/api/library`);
			if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
			const data = await res.json();
			const list = Array.isArray(data.tracks) ? data.tracks : [];
			setTracks(list);
			setStatusMsg({
				success: true,
				text: `Conectado: se encontraron ${list.length} canciones en el servidor.`,
			});
		} catch (e) {
			setStatusMsg({
				success: false,
				text: `Error de conexión con el servidor (${url}): ${e instanceof Error ? e.message : String(e)}`,
			});
		} finally {
			setIsConnecting(false);
		}
	}, [cleanUrl, serverUrl]);

	useEffect(() => {
		if (opened && tracks.length === 0 && !isConnecting) {
			void loadLibrary();
		}
	}, [opened, tracks.length, isConnecting, loadLibrary]);

	const loadTrackIntoEditor = useCallback(
		async (track: any) => {
			const url = cleanUrl(serverUrl);
			setLoadingTrackId(track.id);
			const toastId = toast.loading(`Cargando audio y letra de "${track.title}"...`);

			try {
				// 1. Descargar audio
				const audioRes = await fetch(`${url}/api/audio/${track.id}`);
				if (!audioRes.ok) throw new Error("No se pudo descargar el archivo de audio");
				const audioBlob = await audioRes.blob();
				const audioFile = new File([audioBlob], track.filename || `${track.title}.m4a`, {
					type: audioBlob.type || "audio/mp4",
				});

				// 2. Cargar en audioEngine
				await audioEngine.loadMusic(audioFile);

				// 3. Obtener letra desde el endpoint del servidor
				let lyricContent = track.raw_ttml || "";
				let lyricType = track.lyrics_type || "none";

				try {
					const lyricRes = await fetch(`${url}/api/lyrics/${track.id}`);
					if (lyricRes.ok) {
						const lyricData = await lyricRes.json();
						if (lyricData.raw_ttml) {
							lyricContent = lyricData.raw_ttml;
							lyricType = "ttml";
						} else if (lyricData.raw_lrc) {
							lyricContent = lyricData.raw_lrc;
							lyricType = "lrc";
						}
					}
				} catch (lyricErr) {
					console.warn("No se pudo obtener endpoint de letras:", lyricErr);
				}

				// 4. Parsear y cargar en el editor
				let parsedLyric: TTMLLyric = { lyricLines: [], metadata: [] };
				if (lyricContent && (lyricType === "ttml" || lyricContent.includes("<tt"))) {
					const ttmlRes = ttmlToAmll(lyricContent);
					if (ttmlRes.success) {
						parsedLyric = {
							metadata: ttmlRes.data.metadata.map((m) => ({ ...m })),
							lyricLines: ttmlRes.data.lyricLines.map((line) => ({
								...line,
								words: line.words.map((w) => ({
									...w,
									id: uid(),
									obscene: w.obscene ?? false,
									emptyBeat: w.emptyBeat ?? 0,
								})),
								ignoreSync: false,
								id: uid(),
							})),
						};
					}
				} else if (lyricContent && lyricContent.includes("[")) {
					const lines = parseLrc(lyricContent);
					parsedLyric = {
						metadata: [],
						lyricLines: lines.map((l) => ({
							...l,
							words: l.words.map((w) => ({
								...w,
								id: uid(),
								obscene: false,
								emptyBeat: 0,
							})),
							ignoreSync: false,
							id: uid(),
						})),
					};
				}

				if (parsedLyric.metadata.length === 0) {
					parsedLyric.metadata = [
						{ key: "musicName", value: [track.title || ""] },
						{ key: "artist", value: [track.artist || ""] },
						{ key: "album", value: [track.album || ""] },
					];
				}

				setActiveTrackId(track.id);
				setProjectId(uid());
				setNewLyricLines(parsedLyric);
				const baseName = track.filename ? track.filename.replace(/\.[^/.]+$/, "") : track.title;
				setSaveFileName(`${baseName}.ttml`);

				toast.update(toastId, {
					render: `"${track.title}" cargada en el editor correctamente`,
					type: "success",
					isLoading: false,
					autoClose: 3000,
				});

				setOpened(false);
			} catch (err) {
				toast.update(toastId, {
					render: `Error al cargar la pista: ${err instanceof Error ? err.message : String(err)}`,
					type: "error",
					isLoading: false,
					autoClose: 5000,
				});
			} finally {
				setLoadingTrackId(null);
			}
		},
		[cleanUrl, serverUrl, setActiveTrackId, setNewLyricLines, setOpened, setProjectId, setSaveFileName],
	);

	const filteredTracks = tracks.filter((t) => {
		if (!searchFilter) return true;
		const q = searchFilter.toLowerCase();
		return (
			(t.title && t.title.toLowerCase().includes(q)) ||
			(t.artist && t.artist.toLowerCase().includes(q)) ||
			(t.album && t.album.toLowerCase().includes(q)) ||
			(t.filename && t.filename.toLowerCase().includes(q))
		);
	});

	return (
		<Dialog.Root open={opened} onOpenChange={setOpened}>
			<Dialog.Content style={{ maxWidth: 700, maxHeight: "85vh" }}>
				<Dialog.Title>Servidor de Música (Tailscale / HTTP)</Dialog.Title>
				<Dialog.Description size="2" mb="3" color="gray">
					Conéctate a tu servidor de música para editar y reincrustar letras TTML directamente en tus canciones.
				</Dialog.Description>

				<Flex direction="column" gap="3">
					<Flex gap="2" align="center">
						<TextField.Root
							value={serverUrl}
							placeholder="http://100.x.y.z:8000 o http://localhost:8000"
							style={{ flexGrow: 1 }}
							onChange={(e) => setServerUrl(e.target.value)}
						/>
						<Button onClick={loadLibrary} disabled={isConnecting}>
							{isConnecting ? "Conectando..." : "Cargar Biblioteca"}
						</Button>
					</Flex>

					{activeTrackId && (
						<Flex justify="between" align="center" p="2" style={{ backgroundColor: "var(--accent-3)", borderRadius: 6 }}>
							<Text size="2">
								Pista activa vinculada: <strong>{tracks.find((t) => t.id === activeTrackId)?.title || activeTrackId}</strong>
							</Text>
							<Button size="1" color="red" variant="soft" onClick={() => setActiveTrackId(null)}>
								Desvincular
							</Button>
						</Flex>
					)}

					{statusMsg && (
						<Callout.Root color={statusMsg.success ? "green" : "red"} size="1">
							<Callout.Text>{statusMsg.text}</Callout.Text>
						</Callout.Root>
					)}

					{tracks.length > 0 && (
						<>
							<TextField.Root
								placeholder="Buscar por título, artista o álbum..."
								value={searchFilter}
								onChange={(e) => setSearchFilter(e.target.value)}
							/>

							<ScrollArea style={{ height: 350 }}>
								<Table.Root variant="surface">
									<Table.Header>
										<Table.Row>
											<Table.ColumnHeaderCell>Título</Table.ColumnHeaderCell>
											<Table.ColumnHeaderCell>Artista</Table.ColumnHeaderCell>
											<Table.ColumnHeaderCell>Letra</Table.ColumnHeaderCell>
											<Table.ColumnHeaderCell>Acción</Table.ColumnHeaderCell>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{filteredTracks.map((t) => (
											<Table.Row key={t.id} align="center">
												<Table.Cell>
													<Text weight="medium">{t.title}</Text>
												</Table.Cell>
												<Table.Cell>
													<Text color="gray">{t.artist}</Text>
												</Table.Cell>
												<Table.Cell>
													{t.lyrics_type === "ttml" || (t.raw_ttml && t.raw_ttml.includes("<tt")) ? (
														<Badge color="green">TTML</Badge>
													) : t.lyrics_type === "lrc" || t.raw_lrc ? (
														<Badge color="blue">LRC</Badge>
													) : (
														<Badge color="gray">Sin letra</Badge>
													)}
												</Table.Cell>
												<Table.Cell>
													<Button
														size="1"
														variant="soft"
														disabled={loadingTrackId === t.id}
														onClick={() => loadTrackIntoEditor(t)}
													>
														{loadingTrackId === t.id ? "Cargando..." : "Editar"}
													</Button>
												</Table.Cell>
											</Table.Row>
										))}
									</Table.Body>
								</Table.Root>
							</ScrollArea>
						</>
					)}
				</Flex>

				<Flex gap="3" mt="4" justify="end">
					<Dialog.Close>
						<Button variant="soft" color="gray">
							Cerrar
						</Button>
					</Dialog.Close>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
	);
};
