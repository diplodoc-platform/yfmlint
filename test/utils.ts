export function formatErrors(errors: unknown[]) {
    if (!errors || !errors.length) {
        return [];
    }

    return errors.map((error) => String(error).replace(/\n/g, '↵'));
}
