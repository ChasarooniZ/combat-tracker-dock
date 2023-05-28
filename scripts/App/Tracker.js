export class CombatDock extends Application {
    constructor (combat) {
        super();
        ui.combatDock?.close();
        ui.combatDock = this;
        if (!document.getElementById("navigation").classList.contains("collapsed")) {
            setTimeout(() => {
                document.getElementById("nav-toggle").click();
            }, 1000);
        }
        this.portraits = [];
        this.combat = combat ?? game.combat;
        this.hooks = [];
        this.setHooks();
    }

    static get defaultOptions() {
        return {
            ...super.defaultOptions,
            id: "combat-dock",
            classes: ["combat-dock"],
            template: `modules/combat-tracker-dock/templates/combat-tracker.hbs`,
            resizable: false,
            popOut: false,
        };
    }

    get sortedCombatants() {
        this.combat.setupTurns();
        return Array.from(this.combat.turns);
    }

    setHooks() {
        this.hooks = [
            {
                hook: "renderCombatTracker",
                fn: this._onRenderCombatTracker.bind(this),
            },
            {
                hook: "createCombatant",
                fn: this.setupCombatants.bind(this),
            },
            {
                hook: "deleteCombatant",
                fn: this.setupCombatants.bind(this),
            },
            {
                hook: "updateCombatant",
                fn: this.updateCombatant.bind(this),
            },
            {
                hook: "updateCombat",
                fn: this._onCombatTurn.bind(this),
            },
            {
                hook: "deleteCombat",
                fn: this._onDeleteCombat.bind(this),
            }
        ]
        for (let hook of this.hooks) {
            hook.id = Hooks.on(hook.hook, hook.fn);
        }
    }

    removeHooks() {
        for (let hook of this.hooks) {
            Hooks.off(hook.hook, hook.id);
        }
    }

    getData() {
        return {
            isGM: game.user.isGM,
        };
    }

    setupCombatants() {
        this.portraits = [];
        this.sortedCombatants.forEach(combatant => this.portraits.push(new CONFIG.combatTrackerDock.CombatantPortrait(combatant)));
        const combatantsContainer = this.element[0].querySelector("#combatants");
        combatantsContainer.innerHTML = "";
        this.portraits.forEach(p => combatantsContainer.appendChild(p.element));
        const isEven = this.portraits.length % 2 === 0;
        this.element[0].classList.toggle("even", isEven);
        const separator = document.createElement("div");
        separator.classList.add("separator");
        combatantsContainer.appendChild(separator);
        this.updateOrder();
    }

    updateCombatant(combatant, updates = {}) {
        if ("initiative" in updates) {
                this.setupCombatants();
            return
        }
        const portrait = this.portraits.find(p => p.combatant === combatant);
        if (portrait) portrait.renderInner();
    }

    updateCombatants() {
        this.portraits.forEach(p => p.renderInner());
    }

    updateOrder() {
        //order combatants so that the current combatant is at the center
        const currentCombatant = this.combat.combatant;
        const combatants = this.sortedCombatants;
        const currentCombatantIndex = combatants.findIndex(c => c === currentCombatant) + combatants.length;
        const tempCombatantList = [...combatants, ...combatants, ...combatants];
        const halfLength = Math.floor(combatants.length / 2);
        const orderedCombatants = tempCombatantList.slice(currentCombatantIndex - halfLength, currentCombatantIndex + halfLength + 1);
        
        const lastCombatant = this.sortedCombatants[this.sortedCombatants.length - 1];

        this.portraits.forEach(p => {
            const combatant = orderedCombatants.find(c => c === p.combatant);
            const index = orderedCombatants.findIndex(c => c === combatant);
            p.element.style.setProperty("order", index*100);
        });

        //get last combatant's order
        const lastCombatantOrder = this.portraits.find(p => p.combatant === lastCombatant).element.style.order;
        //set separator's order to last combatant's order + 1
        const separator = this.element[0].querySelector(".separator");
        separator.style.setProperty("order", parseInt(lastCombatantOrder) + 1);
    }

    activateListeners(html) {
        if(this._closed) return this.close();
        super.activateListeners(html);
        this.setupCombatants();
        document.querySelector("#ui-top").prepend(this.element[0]);
        this.element[0].querySelectorAll(".buttons-container i").forEach(i => {
            i.addEventListener("click", (e) => {
                const action = e.currentTarget.dataset.action;
                switch (action) {
                    case "previous-turn":
                        this.combat.previousTurn();
                        break;
                    case "next-turn":
                        this.combat.nextTurn();
                        break;
                    case "previous-round":
                        this.combat.previousRound();
                        break;
                    case "next-round":
                        this.combat.nextRound();
                        break;
                    case "end-combat":
                        this.combat.endCombat();
                        break;
                    case "roll-all":
                        this.combat.rollAll();
                        break;
                    case "roll-npc":
                        this.combat.rollNPC();
                        break;
                    case "reset":
                        this.combat.resetAll();
                        break;
                    case "configure":
                        new CombatTrackerConfig().render(true);
                        break;
                    case "start-combat":
                        this.combat.startCombat();
                        break;
                }
            });
        });
    }

    _onRenderCombatTracker() {
        this.portraits.forEach(p => p.renderInner());
    }

    _onCombatTurn(combat, updates, update) {
        if(!("turn" in updates) && !("round" in updates)) return;
        const combatantsContainer = this.element[0].querySelector("#combatants");
        const filteredChildren = Array.from(combatantsContainer.children).filter(c => !c.classList.contains("separator"));
        const currentSize = combatantsContainer.getBoundingClientRect();
        combatantsContainer.style.minWidth = currentSize.width + "px";
        combatantsContainer.style.minHeight = currentSize.height + "px";
        //find combatant with lowest order

        const childrenByHighestOrder = [...filteredChildren].sort((a, b) => b.style.order - a.style.order);
        const childrenByLowestOrder = [...filteredChildren].sort((a, b) => a.style.order - b.style.order);

        const currentCombatant = this.combat.combatant;
        const currentIndex = this.sortedCombatants.findIndex(c => c === currentCombatant);
        let nextDefeatedCount = 0;
        let previousDefeatedCount = 0;
        const sortedCombatants = this.sortedCombatants;
        for (let i = 0 + 1; i < sortedCombatants.length; i++) {
            const index = (currentIndex + i) % sortedCombatants.length;
            const combatant = sortedCombatants[index];
            if(combatant.defeated) previousDefeatedCount++;
            else break;
        }

        for (let i = 0 + 1; i < sortedCombatants.length; i++) {
            const index = (currentIndex - i + sortedCombatants.length) % sortedCombatants.length;
            const combatant = sortedCombatants[index];
            if (combatant.defeated) nextDefeatedCount++;
            else break;
        }

        const nextDefeatedCombatants = childrenByLowestOrder.slice(0, nextDefeatedCount+1);
        const previousDefeatedCombatants = childrenByHighestOrder.slice(0, previousDefeatedCount+1);
        
        const first = nextDefeatedCount != 0 ? nextDefeatedCombatants : [[...filteredChildren].reduce((a, b) => a.style.order < b.style.order ? a : b, combatantsContainer.children[0])];
        const last = previousDefeatedCount != 0 ? previousDefeatedCombatants : [[...filteredChildren].reduce((a, b) => a.style.order > b.style.order ? a : b, combatantsContainer.children[0])];

        const els = update.direction === 1 ? first : last;
        for (const el of els) {
            el.classList.add("collapsed");
            setTimeout(() => {
                this.updateOrder();
                el.classList.remove("collapsed")
                setTimeout(() => {
                    combatantsContainer.style.minWidth = "";
                    combatantsContainer.style.minHeight = "";
                }, 200);
            }, 200);
        }
    }

    _onDeleteCombat(combat) {
        if(combat === this.combat) this.close();
    }

    async close(...args) {
        this.removeHooks();
        if (this.element[0]) this.element[0].remove();
        this._closed = true;
        return super.close(...args);
    }
}