import { GameController } from "./GameController";
import { UIRenderer } from "./UIRenderer";
import { BuildMaker } from "../BuildMaker"; 
import { PlayerValue } from "../PlayerValue"; // <-- AJOUT POUR RÉCUPÉRER LES CLÉS
import { TIERS } from "../constants"; 

document.addEventListener("DOMContentLoaded", () => {
    // --- 1. RÉCUPÉRATION DES ÉLÉMENTS DOM ---
    const dom = {
        // ... (tes autres éléments)
        targetNameInput: document.getElementById("target-name-input") as HTMLInputElement,
        targetTierInput: document.getElementById("target-tier-input") as HTMLInputElement,
        targetStatsDiv: document.getElementById("target-stats") as HTMLDivElement,

        slotsContainer: document.getElementById("slots-container") as HTMLDivElement,
        playerStatsContainer: document.getElementById("player-stats-container") as HTMLDivElement,
        totalDpsDisplay: document.getElementById("total-dps-display") as HTMLDivElement,
        inventoryGrid: document.getElementById("inventory-grid") as HTMLDivElement,
        
        filterTypeSelect: document.getElementById("filter-type") as HTMLSelectElement,
        searchInput: document.getElementById("search-input") as HTMLInputElement,
        applyNoStackCheckbox: document.getElementById("apply-no-stack") as HTMLInputElement,
        
        // Build Maker
        btnOpenBuildMaker: document.getElementById('btn-open-build-maker'),
        btnCloseBuildMaker: document.getElementById('btn-close-build-maker'),
        buildMakerLightbox: document.getElementById('build-maker-lightbox'),
        btnGenerateBuild: document.getElementById('btn-generate-build'),
        bmSlotCount: document.getElementById('bm-slot-count') as HTMLInputElement,
        
        // Nouveaux éléments dynamiques du Build Maker
        bmReqSelect: document.getElementById('bm-req-select') as HTMLSelectElement,
        bmReqAdd: document.getElementById('bm-req-add') as HTMLButtonElement,
        bmReqContainer: document.getElementById('bm-req-container') as HTMLDivElement,
        bmReqEmptyText: document.getElementById('bm-req-empty-text') as HTMLDivElement,

        bmTypes: {
            default: document.getElementById('bm-type-default') as HTMLInputElement,
            egg: document.getElementById('bm-type-egg') as HTMLInputElement,
            spill: document.getElementById('bm-type-spill') as HTMLInputElement,
            radiation: document.getElementById('bm-type-radiation') as HTMLInputElement,
        },

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
        
        // MODIFICATION : On transmet l'état de la checkbox
        const applyNoStack = dom.applyNoStackCheckbox?.checked || false;
        UIRenderer.renderInventory(dom.inventoryGrid, dom.targetStatsDiv, tName, tTier, dom.filterTypeSelect.value, dom.searchInput.value, applyNoStack, refreshAll);
        
        UIRenderer.renderPlayerStats(dom.playerStatsContainer); 

        if (dom.talentsContainer) {
            UIRenderer.renderTalents(
                dom.talentsContainer,
                GameController.getTalents(),
                GameController.getTalentDefs(),
                GameController.getTPInfo(),
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
        
        const inventoryItems = GameController.getInventoryData(dom.targetNameInput.value, Number(dom.targetTierInput.value), "all", "", false);

        UIRenderer.renderCatalog(
            dom.catalogGrid, 
            tier, 
            searchQuery, 
            inventoryItems, 
            (name: string, tier: number) => { 
                GameController.addItem(name, tier, 1);
                refreshAll(); 
                refreshCatalog(); 
            },
            (name: string, tier: number) => { 
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
    dom.applyNoStackCheckbox?.addEventListener("change", refreshAll); // <-- NOUVEAU

    dom.talentLevelInput?.addEventListener("input", (e) => {
        const val = parseInt((e.target as HTMLInputElement).value, 10);
        if (!isNaN(val) && val >= 0) {
            GameController.setPlayerLevel(val);
            refreshAll();
        }
    });

    // --- 5. GESTION DES LIGHTBOX ---
    // --- GESTION DU BUILD MAKER ---
    if (dom.btnOpenBuildMaker && dom.btnCloseBuildMaker && dom.buildMakerLightbox && dom.btnGenerateBuild) {
        
        // Initialisation de la liste de toutes les statistiques possibles
        const allStats = PlayerValue.getAllStatKeys();
        allStats.forEach(stat => {
            dom.bmReqSelect.add(new Option(stat.label, stat.id));
        });

        // Ajouter dynamiquement une ligne de contrainte
        dom.bmReqAdd.addEventListener('click', () => {
            const selectedId = dom.bmReqSelect.value;
            const selectedLabel = dom.bmReqSelect.options[dom.bmReqSelect.selectedIndex].text;

            // Vérifier si la ligne n'existe pas déjà
            if (document.getElementById(`req-row-${selectedId}`)) return;

            if (dom.bmReqEmptyText) dom.bmReqEmptyText.style.display = "none";

            const row = document.createElement("div");
            row.id = `req-row-${selectedId}`;
            row.dataset.key = selectedId;
            row.style.cssText = "display: flex; justify-content: space-between; align-items: center;";
            row.innerHTML = `
                <label style="color: #fff; font-size: 0.95em;">${selectedLabel} :</label>
                <div style="display: flex; gap: 5px; align-items: center;">
                    <input type="number" step="0.1" value="0" class="req-input" style="width: 60px; background: rgba(0,0,0,0.4); color: #fff; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 4px; text-align: center;">
                    <button class="req-remove" style="background: #e74c3c; color: white; border: none; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 0.8em; font-weight: bold;">✖</button>
                </div>
            `;
            
            // Suppression de la ligne
            row.querySelector('.req-remove')?.addEventListener('click', () => {
                row.remove();
                if (dom.bmReqContainer.children.length <= 1) { // 1 correspond au EmptyText caché
                    if (dom.bmReqEmptyText) dom.bmReqEmptyText.style.display = "block";
                }
            });

            dom.bmReqContainer.appendChild(row);
        });

        dom.btnOpenBuildMaker.addEventListener('click', () => { 
            const maxSlots = GameController.getMaxSlots();
            dom.bmSlotCount.max = maxSlots.toString();
            if (Number(dom.bmSlotCount.value) > maxSlots) {
                dom.bmSlotCount.value = maxSlots.toString();
            }
            dom.buildMakerLightbox!.style.display = 'flex'; 
        });
        
        dom.btnCloseBuildMaker.addEventListener('click', () => { dom.buildMakerLightbox!.style.display = 'none'; });
        
        dom.buildMakerLightbox.addEventListener('click', (e) => {
            if (e.target === dom.buildMakerLightbox) dom.buildMakerLightbox!.style.display = 'none';
        });

        dom.btnGenerateBuild.addEventListener('click', () => {
            const allowedTypes = [];
            if (dom.bmTypes.default.checked) allowedTypes.push("default");
            if (dom.bmTypes.egg.checked) allowedTypes.push("egg");
            if (dom.bmTypes.spill.checked) allowedTypes.push("spill");
            if (dom.bmTypes.radiation.checked) allowedTypes.push("radiation");

            const targetSlots = Number(dom.bmSlotCount.value) || 5;

            // LECTURE DYNAMIQUE DES CONTRAINTES CRÉÉES
            const minRequirements: Record<string, number> = {};
            const reqRows = dom.bmReqContainer.querySelectorAll('[data-key]');
            
            reqRows.forEach((row) => {
                const key = (row as HTMLElement).dataset.key!;
                const input = row.querySelector('.req-input') as HTMLInputElement;
                const val = Number(input.value) || 0;
                if (val > 0) {
                    minRequirements[key] = val;
                }
            });

            // ENVOI AU BUILD MAKER
            const newBuild = BuildMaker.generateAutoBuild(
                allowedTypes,
                dom.targetNameInput.value,
                Number(dom.targetTierInput.value),
                targetSlots,
                minRequirements
            );

            GameController.applyBuild(newBuild.slots, newBuild.talents);

            if (BuildMaker.lastAuditLog) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(BuildMaker.lastAuditLog, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `build_maker_report_${dom.targetNameInput.value}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();
            }

            dom.buildMakerLightbox!.style.display = 'none';
            refreshAll();
        });
    }

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