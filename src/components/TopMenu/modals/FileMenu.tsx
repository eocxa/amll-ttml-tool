import { Button, DropdownMenu } from "@radix-ui/themes";
import type { CSSProperties } from "react";
import { Toolbar } from "radix-ui";
import { Trans, useTranslation } from "react-i18next";
import { ImportExportLyric } from "$/modules/project/modals/ImportExportLyric";
import { formatKeyBindings } from "$/utils/keybindings";
import { useTopMenuActions } from "../useTopMenuActions";

type FileMenuProps = {
	variant: "toolbar" | "submenu";
	buttonStyle?: CSSProperties;
};

const FileMenuItems = () => {
	const { t } = useTranslation();
	const menu = useTopMenuActions();

	return (
		<>
			<DropdownMenu.Item
				onSelect={menu.onNewFile}
				shortcut={formatKeyBindings(menu.newFileKey)}
			>
				<Trans i18nKey="topBar.menu.newLyric">Nuevo archivo TTML</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Item
				onSelect={menu.onOpenFile}
				shortcut={formatKeyBindings(menu.openFileKey)}
			>
				<Trans i18nKey="topBar.menu.openLyric">Abrir archivo TTML</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={menu.onOpenFileFromClipboard}>
				<Trans i18nKey="topBar.menu.openFromClipboard">
					Abrir TTML desde portapapeles
				</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Item
				onSelect={menu.onSaveFile}
				shortcut={formatKeyBindings(menu.saveFileKey)}
			>
				<Trans i18nKey="topBar.menu.saveLyric">Guardar archivo TTML</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={menu.onOpenHistoryRestore}>
				{t("topBar.menu.restoreFromHistory", "Restaurar desde historial...")}
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={menu.onSaveFileToClipboard}>
				<Trans i18nKey="topBar.menu.saveLyricToClipboard">
					Copiar TTML al portapapeles
				</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<ImportExportLyric />
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={menu.onSubmitToAMLLDB}>
				<Trans i18nKey="topBar.menu.uploadToAMLLDB">
					Subir a base de datos AMLL
				</Trans>
			</DropdownMenu.Item>
			<DropdownMenu.Separator />
			<DropdownMenu.Item onSelect={menu.onOpenServerSync}>
				{t("topBar.menu.serverSync", "Servidor de Música (Tailscale / HTTP)...")}
			</DropdownMenu.Item>
			<DropdownMenu.Item onSelect={menu.onSaveToServer}>
				{t("topBar.menu.saveToServer", "Guardar y reincrustar en el servidor")}
			</DropdownMenu.Item>
		</>
	);
};

export const FileMenu = (props: FileMenuProps) => {
	if (props.variant === "submenu") {
		return (
			<DropdownMenu.Sub>
				<DropdownMenu.SubTrigger>
					<Trans i18nKey="topBar.menu.file">Archivo</Trans>
				</DropdownMenu.SubTrigger>
				<DropdownMenu.SubContent>
					<FileMenuItems />
				</DropdownMenu.SubContent>
			</DropdownMenu.Sub>
		);
	}

	return (
		<DropdownMenu.Root>
			<Toolbar.Button asChild>
				<DropdownMenu.Trigger>
					<Button variant="soft" style={props.buttonStyle}>
						<Trans i18nKey="topBar.menu.file">Archivo</Trans>
					</Button>
				</DropdownMenu.Trigger>
			</Toolbar.Button>
			<DropdownMenu.Content>
				<FileMenuItems />
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	);
};
