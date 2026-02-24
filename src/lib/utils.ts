export function getIconUrl(iconName?: string) {
    if (!iconName || iconName.trim() === '') return '';
    if (iconName.startsWith('http')) return iconName;
    return new URL(`../assets/${iconName}`, import.meta.url).href;
}
