// formatNumber.ts

export function formatNumber(num: number | undefined | null): string {
    // Gestion des valeurs vides ou invalides
    if (num === undefined || num === null || isNaN(num)) return "-";
    if (num === 0) return "0";

    const absNum = Math.abs(num);
    const sign = num < 0 ? "-" : "";

    // Pour les petits nombres (en dessous de 1000), on garde jusqu'à 3 décimales
    if (absNum < 1000) {
        return sign + Number(absNum.toFixed(3)).toString();
    }

    // Liste des suffixes : Kilo, Million, Milliard (Billion), Trillion, Quadrillion, etc.
    const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc"];
    
    // On calcule l'index du suffixe en fonction de la taille du nombre (par palier de 1000)
    const suffixIndex = Math.floor(Math.log10(absNum) / 3);
    
    // Sécurité si le nombre est absurdement géant (dépasse les Décillions)
    if (suffixIndex >= suffixes.length) {
        return num.toExponential(2); 
    }

    // On divise le nombre pour l'afficher avec son suffixe
    const shortValue = absNum / Math.pow(1000, suffixIndex);
    
    // On limite à 2 décimales pour l'affichage court (ex: 1.25M)
    const formattedValue = Number(shortValue.toFixed(2)).toString();

    return sign + formattedValue + suffixes[suffixIndex];
}