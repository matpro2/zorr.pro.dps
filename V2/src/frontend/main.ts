// main.ts

import { GameController } from "./GameController";
import { UIRenderer } from "./UIRenderer";
import { TIERS } from "../constants"; 

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. RÉCUPÉRATION DES ÉLÉMENTS DOM ---
    // --- 1. RÉCUPÉRATION DES ÉLÉMENTS DOM ---
    const dom = {
        targetNameInput: document.getElementById("target-name-input") as HTMLInputElement,
        targetTierInput: document.getElementById("target-tier-input") as HTMLInputElement,
        targetStatsDiv: document.getElementById("target-stats") as HTMLDivElement,

        slotsContainer: document.getElementById("slots-container") as HTMLDivElement,
        playerStatsContainer: document.getElementById("player-stats-container") as HTMLDivElement,
        totalDpsDisplay: document.getElementById("total-dps-display") as HTMLDivElement,
        inventoryGrid: document.getElementById("inventory-grid") as HTMLDivElement,
        
        filterTypeSelect: document.getElementById("filter-type") as HTMLSelectElement,
        searchInput: document.getElementById("search-input") as HTMLInputElement,
        
        // Talents
        talentLevelInput: document.getElementById("talent-level-input") as HTMLInputElement,
        btnOpenTalents: document.getElementById('btn-open-talents'),
        btnCloseTalents: document.getElementById('btn-close-talents'),
        talentsLightbox: document.getElementById('talents-lightbox'),
        talentsContainer: document.getElementById('talents-container') as HTMLDivElement,

        // Catalogue Petals
        btnOpenCatalog: document.getElementById('btn-open-catalog'),
        btnCloseCatalog: document.getElementById('btn-close-catalog'),
        catalogLightbox: document.getElementById('catalog-lightbox'),
        catalogTierInput: document.getElementById('catalog-tier-input') as HTMLSelectElement, 
        catalogSearchInput: document.getElementById('catalog-search-input') as HTMLInputElement,
        catalogGrid: document.getElementById('catalog-grid') as HTMLDivElement,

        // Catalogue Mob 
        btnCloseMobCatalog: document.getElementById('btn-close-mob-catalog'),
        mobCatalogLightbox: document.getElementById('mob-catalog-lightbox'),
        mobCatalogTierInput: document.getElementById('mob-catalog-tier-input') as HTMLSelectElement, 
        mobCatalogSearchInput: document.getElementById('mob-catalog-search-input') as HTMLInputElement,
        mobCatalogGrid: document.getElementById('mob-catalog-grid') as HTMLDivElement,

        // Import / Export / Clear
        btnClearInventory: document.getElementById('btn-clear-inventory') as HTMLButtonElement,
        btnExportInventory: document.getElementById('btn-export-inventory') as HTMLButtonElement,
        btnImportInventory: document.getElementById('btn-import-inventory') as HTMLButtonElement,
        importFileInput: document.getElementById('import-file-input') as HTMLInputElement
    };

    // --- 2. INITIALISATION ---
    TIERS.forEach((tier, index) => {
        if (dom.catalogTierInput) dom.catalogTierInput.add(new Option(tier.Name, index.toString()));
        if (dom.mobCatalogTierInput) dom.mobCatalogTierInput.add(new Option(tier.Name, index.toString()));
    });

    if (dom.talentLevelInput) {
        dom.talentLevelInput.value = GameController.getPlayerLevel().toString();
    }

    // --- 3. FONCTIONS DE MISE À JOUR ---
    function refreshAll() {
        GameController.refreshPlayerStats();
        
        const tName = dom.targetNameInput.value;
        const tTier = Number(dom.targetTierInput.value);

        UIRenderer.renderSlots(dom.slotsContainer, dom.totalDpsDisplay, tName, tTier, refreshAll);
        UIRenderer.renderInventory(dom.inventoryGrid, dom.targetStatsDiv, tName, tTier, dom.filterTypeSelect.value, dom.searchInput.value, refreshAll);
        UIRenderer.renderPlayerStats(dom.playerStatsContainer); 

        if (dom.talentsContainer) {
            UIRenderer.renderTalents(
                dom.talentsContainer,
                GameController.getTalents(),
                GameController.getTalentDefs(),
                GameController.getTPInfo(), // Nouveau passage des infos TP
                (id, lvl) => {
                    GameController.setTalentLevel(id, lvl);
                    refreshAll();
                }
            );
        }
    }

    function refreshCatalog() {
        if (!dom.catalogTierInput || !dom.catalogGrid) return;
        const tier = Number(dom.catalogTierInput.value);
        const searchQuery = dom.catalogSearchInput?.value || "";
        
        const inventoryItems = GameController.getInventoryData(dom.targetNameInput.value, Number(dom.targetTierInput.value), "all", "");

        UIRenderer.renderCatalog(
            dom.catalogGrid, 
            tier, 
            searchQuery, 
            inventoryItems, 
            (name: string, tier: number) => { // Callback d'ajout
                GameController.addItem(name, tier, 1);
                refreshAll(); 
                refreshCatalog(); 
            },
            (name: string, tier: number) => { // NOUVEAU: Callback de suppression
                GameController.removeOneItemByNameAndTier(name, tier);
                refreshAll();
                refreshCatalog();
            }
        );
    }

    function refreshMobCatalog() {
        if (!dom.mobCatalogTierInput || !dom.mobCatalogGrid) return;
        const tier = Number(dom.mobCatalogTierInput.value);
        const searchQuery = dom.mobCatalogSearchInput?.value || "";

        UIRenderer.renderMobCatalog(dom.mobCatalogGrid, tier, searchQuery, (name: string, tier: number) => {
            dom.targetNameInput.value = name;
            dom.targetTierInput.value = tier.toString();
            dom.mobCatalogLightbox!.style.display = 'none'; 
            refreshAll();
        });
    }

    // --- 4. ÉCOUTEURS D'ÉVÉNEMENTS GÉNÉRAUX ---
    dom.searchInput.addEventListener("input", refreshAll); 
    dom.filterTypeSelect.addEventListener("change", refreshAll);

    dom.talentLevelInput?.addEventListener("input", (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        if (!isNaN(val) && val >= 0) {
            GameController.setPlayerLevel(val);
            refreshAll();
        }
    });

    // --- 5. GESTION DES LIGHTBOX ---
    
    // Talents
    if (dom.btnOpenTalents && dom.btnCloseTalents && dom.talentsLightbox) {
        dom.btnOpenTalents.addEventListener('click', () => { dom.talentsLightbox!.style.display = 'flex'; });
        dom.btnCloseTalents.addEventListener('click', () => { dom.talentsLightbox!.style.display = 'none'; });
        dom.talentsLightbox.addEventListener('click', (e) => {
            if (e.target === dom.talentsLightbox) dom.talentsLightbox!.style.display = 'none';
        });
    }

    // Catalogue Petals
    if (dom.btnOpenCatalog && dom.btnCloseCatalog && dom.catalogLightbox) {
        dom.btnOpenCatalog.addEventListener('click', () => { 
            dom.catalogLightbox!.style.display = 'flex'; 
            refreshCatalog(); 
        });
        dom.btnCloseCatalog.addEventListener('click', () => { dom.catalogLightbox!.style.display = 'none'; });
        dom.catalogLightbox.addEventListener('click', (e) => {
            if (e.target === dom.catalogLightbox) dom.catalogLightbox!.style.display = 'none';
        });
    }

    if (dom.catalogTierInput) dom.catalogTierInput.addEventListener('change', refreshCatalog);
    if (dom.catalogSearchInput) dom.catalogSearchInput.addEventListener('input', refreshCatalog);

    // Catalogue Mob 
    if (dom.targetStatsDiv && dom.btnCloseMobCatalog && dom.mobCatalogLightbox) {
        dom.targetStatsDiv.addEventListener('click', () => { 
            dom.mobCatalogLightbox!.style.display = 'flex'; 
            refreshMobCatalog(); 
        });
        dom.btnCloseMobCatalog.addEventListener('click', () => { dom.mobCatalogLightbox!.style.display = 'none'; });
        dom.mobCatalogLightbox.addEventListener('click', (e) => {
            if (e.target === dom.mobCatalogLightbox) dom.mobCatalogLightbox!.style.display = 'none';
        });
    }

    if (dom.mobCatalogTierInput) dom.mobCatalogTierInput.addEventListener('change', refreshMobCatalog);
    if (dom.mobCatalogSearchInput) dom.mobCatalogSearchInput.addEventListener('input', refreshMobCatalog);

    // --- 6. GESTION CLEAR / IMPORT / EXPORT ---
    if (dom.btnClearInventory) {
        dom.btnClearInventory.addEventListener('click', () => {
            if (confirm("Voulez-vous vraiment vider tout votre inventaire et vos pétales équipées ?")) {
                GameController.clearInventory();
                refreshAll();
            }
        });
    }

    if (dom.btnExportInventory) {
        dom.btnExportInventory.addEventListener('click', () => {
            const data = GameController.exportInventoryData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "florr_inventory.json";
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    if (dom.btnImportInventory && dom.importFileInput) {
        dom.btnImportInventory.addEventListener('click', () => {
            dom.importFileInput.click();
        });

        dom.importFileInput.addEventListener('change', (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target?.result as string);
                    GameController.importInventoryData(data);
                    refreshAll();
                    alert("Inventaire importé avec succès !");
                } catch (err) {
                    alert("Erreur lors de l'importation. Le fichier JSON est invalide.");
                }
                dom.importFileInput.value = ""; 
            };
            reader.readAsText(file);
        });
    }

    // Premier affichage de la page
    refreshAll();
});