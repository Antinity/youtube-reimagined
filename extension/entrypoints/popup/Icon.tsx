import { Icon } from '@iconify/react/offline';
import puzzle from '@iconify-icons/mdi/puzzle';
import brush from '@iconify-icons/mdi/brush-variant';
import web from '@iconify-icons/mdi/web';
import plus from '@iconify-icons/mdi/plus';
import minus from '@iconify-icons/mdi/minus';
import help from '@iconify-icons/mdi/help-circle-outline';
import cog from '@iconify-icons/mdi/cog';
import back from '@iconify-icons/mdi/chevron-left';
import search from '@iconify-icons/mdi/magnify';
import upload from '@iconify-icons/mdi/cloud-upload-outline';
import warning from '@iconify-icons/mdi/alert';
import check from '@iconify-icons/mdi/check';
import system from '@iconify-icons/mdi/sync';
import close from '@iconify-icons/mdi/close';
import discord from '@iconify-icons/mdi/discord';

const icons = { puzzle, brush, web, plus, minus, help, cog, back, search, upload, warning, check, system, close, discord };
export type IconName = keyof typeof icons;

export function AppIcon({ name, size = 24 }: { name: IconName; size?: number }) {
  return <Icon icon={icons[name]} width={size} height={size} aria-hidden="true" ssr />;
}
