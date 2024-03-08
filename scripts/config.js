import { MODULE_ID } from "./main.js";
import { AttributesConfig } from "./attributesConfig.js";
import {registerSystemSettings} from "./systems.js";

export var injectConfig = {
	inject: function injectConfig(app, html, data, object) {
		this._generateTabStruct(app, html, data, object);
		const tabSize = data.tab?.width ?? 100;
		object = object || app.object;
		const moduleId = data.moduleId;
		let injectPoint;
		if (typeof data.inject === "string") {
			injectPoint = html.find(data.inject).first().closest(".form-group");
		} else {
			injectPoint = data.inject;
		}
		injectPoint = injectPoint ? $(injectPoint) : data.tab ? html.find(".tab").last() : html.find(".form-group").last();
		let injectHtml = "";
		for (const [k, v] of Object.entries(data)) {
			if (k === "moduleId" || k === "inject" || k === "tab") continue;
			const elemData = data[k];
			const flag = "flags." + moduleId + "." + (k || "");
			const flagValue = object?.getFlag(moduleId, k) ?? elemData.default ?? getDefaultFlag(k);
			const notes = v.notes ? `<p class="notes">${v.notes}</p>` : "";
			v.label = v.units ? v.label + `<span class="units"> (${v.units})</span>` : v.label;
			switch (elemData.type) {
				case "text":
					injectHtml += `<div class="form-group">
                        <label for="${k}">${v.label || ""}</label>
                            <input type="text" name="${flag}" value="${flagValue}" placeholder="${v.placeholder || ""}">${notes}
                    </div>`;
					break;
				case "number":
					injectHtml += `<div class="form-group">
                        <label for="${k}">${v.label || ""}</label>
                            <input type="number" name="${flag}" min="${v.min}" max="${v.max}" step="${v.step ?? 1}" value="${flagValue}" placeholder="${
						v.placeholder || ""
					}">${notes}
                    </div>`;
					break;
				case "checkbox":
					injectHtml += `<div class="form-group">
                        <label for="${k}">${v.label || ""}</label>
                            <input type="checkbox" name="${flag}" ${flagValue ? "checked" : ""}>${notes}
                    </div>`;
					break;
				case "select":
					injectHtml += `<div class="form-group">
                        <label for="${k}">${v.label || ""}</label>
                            <select name="${flag}">`;
					for (const [i, j] of Object.entries(v.options)) {
						injectHtml += `<option value="${i}" ${flagValue === i ? "selected" : ""}>${j}</option>`;
					}
					injectHtml += `</select>${notes}
                    </div>`;
					break;
				case "range":
					injectHtml += `<div class="form-group">
                        <label for="${k}">${v.label || ""}</label>
                        <div class="form-fields">
                            <input type="range" name="${flag}" value="${flagValue}" min="${v.min}" max="${v.max}" step="${v.step ?? 1}">
                            <span class="range-value">${flagValue}</span>${notes}
                        </div>
                    </div>`;
					break;
				case "color":
					injectHtml += `<div class="form-group">
                        <label for="${k}">${v.label || ""}</label>
                        <div class="form-fields">
                            <input class="color" type="text" name="${flag}" value="${flagValue}">
                            <input type="color" data-edit="${flag}" value="${flagValue}">
                        </div>
                        ${notes}
                    </div>`;
					break;
				case "custom":
					injectHtml += v.html;
					break;
			}
			if (elemData.type?.includes("filepicker")) {
				const fpType = elemData.type.split(".")[1] || "imagevideo";
				injectHtml += `<div class="form-group">
                <label for="${k}">${v.label || ""}</label>
                <div class="form-fields">     
                    <button type="button" class="file-picker" data-extras="${
						elemData.fpTypes ? elemData.fpTypes.join(",") : ""
					}" data-type="${fpType}" data-target="${flag}" title="Browse Files" tabindex="-1">
                        <i class="fas fa-file-import fa-fw"></i>
                    </button>
                    <input class="image" type="text" name="${flag}" placeholder="${v.placeholder || ""}" value="${flagValue}">
                </div>${notes}
            </div>`;
			}
		}
		injectHtml = $(injectHtml);
		injectHtml.on("click", ".file-picker", this.fpTypes, _bindFilePicker);
		injectHtml.on("change", `input[type="color"]`, _colorChange);
		if (data.tab) {
			const injectTab = createTab(data.tab.name, data.tab.label, data.tab.icon).append(injectHtml);
			injectPoint.after(injectTab);
			app?.setPosition({ height: "auto", width: data.tab ? app.options.width + tabSize : "auto" });
			return injectHtml;
		}
		injectPoint.after(injectHtml);
		if (app) app?.setPosition({ height: "auto", width: data.tab ? app.options.width + tabSize : "auto" });
		return injectHtml;

		function createTab(name, label, icon) {
			/*let tabs = html.find(".sheet-tabs").last();
            if(!tabs.length) tabs = html.find(`nav[data-group="main"]`);*/
			const tabs = html.find(".sheet-tabs").first().find(".item").last();
			const tab = `<a class="item" data-tab="${name}"><i class="${icon}"></i> ${label}</a>`;
			tabs.after(tab);
			const tabContainer = `<div class="tab" data-tab="${name}"></div>`;
			return $(tabContainer);
		}

		function getDefaultFlag(inputType) {
			switch (inputType) {
				case "number":
					return 0;
				case "checkbox":
					return false;
			}
			return "";
		}

		function _colorChange(e) {
			const input = $(e.target);
			const edit = input.data("edit");
			const value = input.val();
			injectHtml.find(`input[name="${edit}"]`).val(value);
		}

		function _bindFilePicker(event) {
			event.preventDefault();
			const button = event.currentTarget;
			const input = $(button).closest(".form-fields").find("input") || null;
			const extraExt = button.dataset.extras ? button.dataset.extras.split(",") : [];
			const options = {
				field: input[0],
				type: button.dataset.type,
				current: input.val() || null,
				button: button,
			};
			const fp = new FilePicker(options);
			fp.extensions ? fp.extensions.push(...extraExt) : (fp.extensions = extraExt);
			return fp.browse();
		}
	},
	quickInject: function quickInject(injectData, data) {
		injectData = Array.isArray(injectData) ? injectData : [injectData];
		for (const doc of injectData) {
			let newData = data;
			if (doc.inject) {
				newData = JSON.parse(JSON.stringify(data));
				data.inject = doc.inject;
			}
			Hooks.on(`render${doc.documentName}Config`, (app, html) => {
				injectConfig.inject(app, html, newData);
			});
		}
	},
	_generateTabStruct: function _generateTabStruct(app, html, data, object) {
		const isTabs = html.find(".sheet-tabs").length;
		const useTabs = data.tab;
		if (isTabs || !useTabs) return;
		const tabSize = data.tab?.width || 100;
		const layer = app?.object?.layer?.options?.name;
		const icon = $(".main-controls").find(`li[data-canvas-layer="${layer}"]`).find("i").attr("class");

		const $tabs = $(`<nav class="sheet-tabs tabs">
        <a class="item active" data-tab="basic"><i class="${icon}"></i> ${game.i18n.localize("LIGHT.HeaderBasic")}</a>
        </nav>
        <div class="tab active" data-tab="basic"></div>`);
		//move all content of form into tab
		const form = html.find("form").first();
		form.children().each((i, e) => {
			$($tabs[2]).append(e);
		});

		form.append($tabs);
		const submitButton = html.find("button[type='submit']").first();
		form.append(submitButton);

		html.on("click", ".item", (e) => {
			html.find(".item").removeClass("active");
			$(e.currentTarget).addClass("active");
			html.find(".tab").removeClass("active");
			html.find(`[data-tab="${e.currentTarget.dataset.tab}"]`).addClass("active");
			app.setPosition({ height: "auto", width: data.tab ? app.options.width + tabSize : "auto" });
		});
	},
};

export function registerSettings() {
    injectConfig.quickInject([{ documentName: "Token" }],
            {
                moduleId: MODULE_ID,
                tab: {
                    name: MODULE_ID,
                    label: game.i18n.localize("pf2e-rpg-numbers.token-options.tab-label"),
                    icon: "fas fa-id-card"
                },
                "dockImage": {
                    type: "filepicker",
                    label: "Tracker Image",
                    notes: "Image for combat tracker",
                    default: "",
                }
            }
        );
    Hooks.on("renderSettingsConfig", (app, html, data) => {
        colorPicker("attributeColor", html);
        colorPicker("attributeColor2", html);
        colorPicker("attributeColorPortrait", html);
        colorPicker("tooltipColor", html);
    });

    game.settings.register(MODULE_ID, "attributes", {
        scope: "world",
        config: false,
        type: Array,
        default: CONFIG.combatTrackerDock.defaultAttributesConfig()[game.system.id] ?? [],
        onChange: () => ui.combatDock?.refresh(),
    });

    game.settings.register(MODULE_ID, "events", {
        scope: "world",
        config: false,
        type: Array,
        default: [],
    });

    game.settings.registerMenu(MODULE_ID, "attributesMenu", {
        name: game.i18n.localize(`${MODULE_ID}.settings.attributesMenu.name`),
        label: game.i18n.localize(`${MODULE_ID}.settings.attributesMenu.label`),
        hint: game.i18n.localize(`${MODULE_ID}.settings.attributesMenu.hint`),
        icon: "fas fa-cogs",
        scope: "world",
        restricted: true,
        type: AttributesConfig,
    });

    game.settings.register(MODULE_ID, "portraitSize", {
        name: "combat-tracker-dock.settings.portraitSize.name",
        hint: "combat-tracker-dock.settings.portraitSize.hint",
        scope: "client",
        config: true,
        type: String,
        choices: {
            "30px": "combat-tracker-dock.settings.portraitSize.choices.30px",
            "50px": "combat-tracker-dock.settings.portraitSize.choices.50px",
            "70px": "combat-tracker-dock.settings.portraitSize.choices.70px",
            "90px": "combat-tracker-dock.settings.portraitSize.choices.90px",
            "110px": "combat-tracker-dock.settings.portraitSize.choices.110px",
            "150px": "combat-tracker-dock.settings.portraitSize.choices.150px",
            "180px": "combat-tracker-dock.settings.portraitSize.choices.180px",
        },
        default: "70px",
        onChange: () => {
            setPortraitSize();
            ui.combatDock?.autosize();
            ui.combatDock?.refresh();
        },
    });

    game.settings.register(MODULE_ID, "overflowStyle", {
        name: "combat-tracker-dock.settings.overflowStyle.name",
        hint: "combat-tracker-dock.settings.overflowStyle.hint",
        scope: "client",
        config: true,
        type: String,
        choices: {
            autofit: "combat-tracker-dock.settings.overflowStyle.choices.autofit",
            hidden: "combat-tracker-dock.settings.overflowStyle.choices.hidden",
            scroll: "combat-tracker-dock.settings.overflowStyle.choices.scroll",
        },
        default: "autofit",
        onChange: () => {
            setOverflowStyle();
            ui.combatDock?.autosize();
            ui.combatDock?.refresh();
        },
    });

    game.settings.register(MODULE_ID, "carouselStyle", {
        name: "combat-tracker-dock.settings.carouselStyle.name",
        hint: "combat-tracker-dock.settings.carouselStyle.hint",
        scope: "world",
        config: true,
        type: Number,
        choices: {
            0: "combat-tracker-dock.settings.carouselStyle.choices.centerCarousel",
            1: "combat-tracker-dock.settings.carouselStyle.choices.leftCarousel",
            2: "combat-tracker-dock.settings.carouselStyle.choices.basic",
        },
        default: 0,
        onChange: () => ui.combatDock?.refresh(),
    });

    game.settings.register(MODULE_ID, "direction", {
        name: "combat-tracker-dock.settings.direction.name",
        hint: "combat-tracker-dock.settings.direction.hint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            row: "combat-tracker-dock.settings.direction.choices.row",
            column: "combat-tracker-dock.settings.direction.choices.column",
        },
        default: "row",
        onChange: () => {
            setDirection();
            setOverflowStyle();
            setFlex();
            ui.combatDock?.autosize();
            ui.combatDock?.refresh();
        },
    });

    game.settings.register(MODULE_ID, "alignment", {
        name: "combat-tracker-dock.settings.alignment.name",
        hint: "combat-tracker-dock.settings.alignment.hint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            left: "combat-tracker-dock.settings.alignment.choices.left",
            center: "combat-tracker-dock.settings.alignment.choices.center",
            right: "combat-tracker-dock.settings.alignment.choices.right",
        },
        default: "center",
        onChange: () => {
            setAlignment();
            setFlex();
            ui.combatDock?.refresh();
        },
    });

    game.settings.register(MODULE_ID, "portraitAspect", {
        name: "combat-tracker-dock.settings.portraitAspect.name",
        hint: "combat-tracker-dock.settings.portraitAspect.hint",
        scope: "world",
        config: true,
        type: Number,
        choices: {
            1: "combat-tracker-dock.settings.portraitAspect.choices.square",
            1.5: "combat-tracker-dock.settings.portraitAspect.choices.portrait",
            2: "combat-tracker-dock.settings.portraitAspect.choices.long",
        },
        default: 1.5,
        onChange: () => {
            setPortraitAspect();
            ui.combatDock?.refresh();
        },
    });

    game.settings.register(MODULE_ID, "roundness", {
        name: "combat-tracker-dock.settings.roundness.name",
        hint: "combat-tracker-dock.settings.roundness.hint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "0%": "combat-tracker-dock.settings.roundness.choices.sharp",
            "10%": "combat-tracker-dock.settings.roundness.choices.soft",
            "20%": "combat-tracker-dock.settings.roundness.choices.round",
        },
        default: "0%",
        onChange: () => {
            setRoundness();
            ui.combatDock?.refresh();
        },
    });

    game.settings.register(MODULE_ID, "attributeColor", {
        name: "combat-tracker-dock.settings.attributeColor.name",
        hint: "combat-tracker-dock.settings.attributeColor.hint",
        scope: "world",
        config: true,
        type: String,
        default: "#41AA7D",
        onChange: () => {
            setAttributeColor();
            ui.combatDock?.refresh();
        },
    });

    game.settings.register(MODULE_ID, "attributeColor2", {
        name: "combat-tracker-dock.settings.attributeColor2.name",
        hint: "combat-tracker-dock.settings.attributeColor2.hint",
        scope: "world",
        config: true,
        type: String,
        default: "#ffcd00",
        onChange: () => {
            setAttributeColor();
            ui.combatDock?.refresh();
        },
    });
    //
    game.settings.register(MODULE_ID, "attributeColorPortrait", {
        name: "combat-tracker-dock.settings.attributeColorPortrait.name",
        hint: "combat-tracker-dock.settings.attributeColorPortrait.hint",
        scope: "world",
        config: true,
        type: String,
        default: "#e62121",
        onChange: () => {
            setAttributeColor();
            ui.combatDock?.refresh();
        },
    });

    game.settings.register(MODULE_ID, "barsPlacement", {
        name: "combat-tracker-dock.settings.barsPlacement.name",
        hint: "combat-tracker-dock.settings.barsPlacement.hint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            left: "combat-tracker-dock.settings.barsPlacement.choices.left",
            right: "combat-tracker-dock.settings.barsPlacement.choices.right",
            twinned: "combat-tracker-dock.settings.barsPlacement.choices.twinned",
        },
        default: "left",
        onChange: () => ui.combatDock?.refresh(),
    });

    game.settings.register(MODULE_ID, "attributeVisibility", {
        name: "combat-tracker-dock.settings.attributeVisibility.name",
        hint: "combat-tracker-dock.settings.attributeVisibility.hint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            text: "combat-tracker-dock.settings.attributeVisibility.choices.text",
            bars: "combat-tracker-dock.settings.attributeVisibility.choices.bars",
            both: "combat-tracker-dock.settings.attributeVisibility.choices.both",
        },
        default: "both",
        onChange: () => ui.combatDock?.refresh(),
    });

    game.settings.register(MODULE_ID, "tooltipColor", {
        name: "combat-tracker-dock.settings.tooltipColor.name",
        hint: "combat-tracker-dock.settings.tooltipColor.hint",
        scope: "world",
        config: true,
        type: String,
        default: "#888888",
        onChange: () => {
            setTooltipColor();
            ui.combatDock?.refresh();
        },
    });

    /*game.settings.register(MODULE_ID, "displayDescriptions", {
        name: "combat-tracker-dock.settings.displayDescriptions.name",
        hint: "combat-tracker-dock.settings.displayDescriptions.hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => ui.combatDock?.refresh(),
    });*/
    game.settings.register(MODULE_ID, "displayDescriptions", {
        name: "combat-tracker-dock.settings.displayDescriptions.name",
        hint: "combat-tracker-dock.settings.displayDescriptions.hint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            "none": "combat-tracker-dock.settings.displayDescriptions.choices.none",
            "owner": "combat-tracker-dock.settings.displayDescriptions.choices.owner",
            "all": "combat-tracker-dock.settings.displayDescriptions.choices.all",
        },
        default: "owner",
        onChange: () => ui.combatDock?.refresh(),
    });

    game.settings.register(MODULE_ID, "hideDefeated", {
        name: "combat-tracker-dock.settings.hideDefeated.name",
        hint: "combat-tracker-dock.settings.hideDefeated.hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => ui.combatDock?.refresh(),
    });    

    game.settings.register(MODULE_ID, "showDispositionColor", {
        name: "combat-tracker-dock.settings.showDispositionColor.name",
        hint: "combat-tracker-dock.settings.showDispositionColor.hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => ui.combatDock?.refresh(),
    });

    game.settings.register(MODULE_ID, "showInitiativeOnPortrait", {
        name: "combat-tracker-dock.settings.showInitiativeOnPortrait.name",
        hint: "combat-tracker-dock.settings.showInitiativeOnPortrait.hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
        onChange: () => ui.combatDock?.refresh(),
    });

    game.settings.register(MODULE_ID, "portraitImage", {
        name: "combat-tracker-dock.settings.portraitImage.name",
        hint: "combat-tracker-dock.settings.portraitImage.hint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            actor: "combat-tracker-dock.settings.portraitImage.choices.actor",
            token: "combat-tracker-dock.settings.portraitImage.choices.token",
            custom: "combat-tracker-dock.settings.portraitImage.choices.custom",
        },
        default: "actor",
        onChange: () => ui.combatDock?.refresh(),
    });

    game.settings.register(MODULE_ID, "displayName", {
        name: "combat-tracker-dock.settings.displayName.name",
        hint: "combat-tracker-dock.settings.displayName.hint",
        scope: "world",
        config: true,
        type: String,
        choices: {
            default: "combat-tracker-dock.settings.displayName.choices.default",
            token: "combat-tracker-dock.settings.displayName.choices.token",
            owner: "combat-tracker-dock.settings.displayName.choices.owner",
        },
        default: "default",
        onChange: () => ui.combatDock?.refresh(),
    });

    game.settings.register(MODULE_ID, "playerPlayerPermission", {
        name: "combat-tracker-dock.settings.playerPlayerPermission.name",
        hint: "combat-tracker-dock.settings.playerPlayerPermission.hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => ui.combatDock?.refresh(),
    });

    game.settings.register(MODULE_ID, "hideFirstRound", {
        name: "combat-tracker-dock.settings.hideFirstRound.name",
        hint: "combat-tracker-dock.settings.hideFirstRound.hint",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => ui.combatDock?.refresh(),
    });

    game.settings.register(MODULE_ID, "portraitImageBorder", {
        name: "combat-tracker-dock.settings.portraitImageBorder.name",
        hint: "combat-tracker-dock.settings.portraitImageBorder.hint",
        scope: "world",
        config: true,
        type: String,
        default: "/modules/combat-tracker-dock/assets/border.png",
        filePicker: "imagevideo",
        onChange: function () {
            setPortraitImageBorder();
            ui.combatDock?.refresh();
        },
    });

    game.settings.register(MODULE_ID, "portraitImageBackground", {
        name: "combat-tracker-dock.settings.portraitImageBackground.name",
        hint: "combat-tracker-dock.settings.portraitImageBackground.hint",
        scope: "world",
        config: true,
        type: String,
        default: "/ui/denim075.png",
        filePicker: "imagevideo",
        onChange: function () {
            setPortraitImageBackground();
            ui.combatDock?.refresh();
        },
    });

    game.settings.register(MODULE_ID, "showSystemIcons", {
        name: "combat-tracker-dock.settings.showSystemIcons.name",
        hint: "combat-tracker-dock.settings.showSystemIcons.hint",
        scope: "world",
        config: true,
        type: Number,
        choices: {
            0: "combat-tracker-dock.settings.showSystemIcons.choices.none",
            1: "combat-tracker-dock.settings.showSystemIcons.choices.tooltip",
            2: "combat-tracker-dock.settings.showSystemIcons.choices.resource",
            3: "combat-tracker-dock.settings.showSystemIcons.choices.both",
        },
        default: 1,
        onChange: () => ui.combatDock?.refresh(),
    });

    registerSystemSettings();

    setAllSettings();

    game.settings.register(MODULE_ID, "resource", {
        scope: "world",
        config: false,
        type: String,
        default: "",
        onChange: () => ui.combatDock?.refresh(),
    });

    game.settings.register(MODULE_ID, "portraitResource", {
        scope: "world",
        config: false,
        type: String,
        default: "",
        onChange: () => ui.combatDock?.refresh(),
    });
}

export function registerWrappers() {
    if (!game.modules.get("lib-wrapper")?.active) return;

    libWrapper.register(MODULE_ID, "Combatant.prototype.visible", function (wrapped, ...args) {
        const visible = wrapped(...args);
        if (!ui.combatDock?.rendered) return visible;
        const cDVisible = ui.combatDock.portraits.find((p) => p.combatant == this)?.firstTurnHidden;
        return visible && !cDVisible;
    });
}

export function registerHotkeys() {
    game.keybindings.register(MODULE_ID, "combatPrev", {
        name: `${MODULE_ID}.hotkeys.combatPrev.name`,
        editable: [{ key: "KeyN", modifiers: [KeyboardManager.MODIFIER_KEYS.SHIFT] }],
        restricted: false,
        onDown: () => {},
        onUp: () => {
            if (!game.combat) return;
            const isOwner = game.combat.combatant?.isOwner;
            if (!isOwner) return;
            game.combat.previousTurn();
        },
    });

    game.keybindings.register(MODULE_ID, "combatNext", {
        name: `${MODULE_ID}.hotkeys.combatNext.name`,
        editable: [{ key: "KeyM", modifiers: [KeyboardManager.MODIFIER_KEYS.SHIFT] }],
        restricted: false,
        onDown: () => {},
        onUp: () => {
            if (!game.combat) return;
            const isOwner = game.combat.combatant?.isOwner;
            if (!isOwner) return;
            game.combat.nextTurn();
        },
    });

}

function setAllSettings() {
    setDirection();
    setOverflowStyle();
    setAlignment();
    setFlex();
    setPortraitAspect();
    setRoundness();
    setAttributeColor();
    setTooltipColor();
    setPortraitImageBorder();
    setPortraitImageBackground();
}

function setPortraitSize() {
    const portraitSize = game.settings.get(MODULE_ID, "portraitSize");
    document.documentElement.style.setProperty("--combatant-portrait-size", portraitSize);
}

function setPortraitAspect() {
    const portraitAspect = game.settings.get(MODULE_ID, "portraitAspect");
    document.documentElement.style.setProperty("--combatant-portrait-aspect", portraitAspect);
}

function setAlignment() {
    const alignment = game.settings.get(MODULE_ID, "alignment");
    document.documentElement.style.setProperty("--carousel-alignment", alignment);
    ui.combatDock?.setControlsOrder();
}

function setPortraitImageBorder() {
    let portraitImageBorder = game.settings.get(MODULE_ID, "portraitImageBorder");
    if (portraitImageBorder && !portraitImageBorder.startsWith("/") && !portraitImageBorder.includes("http")) portraitImageBorder = `/${portraitImageBorder}`;
    document.documentElement.style.setProperty("--combatant-portrait-image-border", `url('${portraitImageBorder}')`);
}

function setPortraitImageBackground() {
    let portraitImageBackground = game.settings.get(MODULE_ID, "portraitImageBackground");
    if (!portraitImageBackground.startsWith("/") && !portraitImageBackground.includes("http")) portraitImageBackground = `/${portraitImageBackground}`;
    document.documentElement.style.setProperty("--combatant-portrait-image-background", `url('${portraitImageBackground}')`);
}

function setRoundness() {
    const roundness = game.settings.get(MODULE_ID, "roundness");
    document.documentElement.style.setProperty("--combatant-portrait-border-radius", roundness);
}

function setAttributeColor() {
    const attributeColor = game.settings.get(MODULE_ID, "attributeColor") || "#41AA7D";
    document.documentElement.style.setProperty("--attribute-bar-primary-color", attributeColor);

    const color = Color.from(attributeColor);
    const darkened = color.mix(Color.from("#000"), 0.5);

    document.documentElement.style.setProperty("--attribute-bar-secondary-color", darkened.toString());

    const attributeColor2 = game.settings.get(MODULE_ID, "attributeColor2") || "#ffcd00";
    document.documentElement.style.setProperty("--attribute-bar-primary-color2", attributeColor2);

    const color2 = Color.from(attributeColor2);
    const darkened2 = color2.mix(Color.from("#000"), 0.5);

    document.documentElement.style.setProperty("--attribute-bar-secondary-color2", darkened2.toString());

    const attributeColorPortrait = game.settings.get(MODULE_ID, "attributeColorPortrait") || "#e62121";
    document.documentElement.style.setProperty("--attribute-bar-portrait-color", attributeColorPortrait);

}

function setTooltipColor() {
    const tooltipColor = game.settings.get(MODULE_ID, "tooltipColor") || "#888888";
    document.documentElement.style.setProperty("--carousel-tooltip-color", tooltipColor);

    const color = Color.from(tooltipColor);
    const darkened = color.mix(Color.from("#000"), 0.65);

    document.documentElement.style.setProperty("--carousel-tooltip-bg-color", darkened.toString());
}

function setOverflowStyle() {
    let overflowStyle = game.settings.get(MODULE_ID, "overflowStyle");
    if (overflowStyle === "autofit") overflowStyle = "hidden";
    if (overflowStyle === "scroll") {
        const direction = game.settings.get(MODULE_ID, "direction");
        if (direction === "row") overflowStyle = "visible hidden";
        else overflowStyle = "hidden visible";
    }
    document.documentElement.style.setProperty("--carousel-overflow", overflowStyle);
}

function setDirection() {
    const direction = game.settings.get(MODULE_ID, "direction");
    document.documentElement.style.setProperty("--carousel-direction", direction);
    document.documentElement.style.setProperty("--combatant-portrait-margin", direction === "row" ? "0 calc(var(--combatant-portrait-size) * 0.1)" : "0");
    ui.combatDock?.setControlsOrder();
}

function setFlex() {
    const alignment = game.settings.get(MODULE_ID, "alignment");
    const direction = game.settings.get(MODULE_ID, "direction");
    let flexD = "flex-start";
    if (direction == "column" && alignment == "right") flexD = "flex-end";
    if (direction == "column" && alignment == "center") flexD = "center";

    document.documentElement.style.setProperty("--carousel-align-items", flexD);
}

function l(key) {
    return game.i18n.localize(key);
}

export function registerSystemSetting(key, data) {
    const rootKey = MODULE_ID + ".settings.systems." + game.system.id;
    game.settings.register(MODULE_ID, game.system.id + "." + key, {
        ...data,
        name: game.system.title + " " + l(MODULE_ID + ".settings.integration") + ": " + l(rootKey+"."+key+".name"),
        hint: l(rootKey+"."+key+".hint"),
    });
}

export function getSystemSetting(key) {
    return game.settings.get(MODULE_ID, game.system.id + "." + key);
}

//Color Picker by kaelad02
//License: MIT
//Documentation: https://github.com/kaelad02/adv-reminder/blob/54207ec1ef0500439e57521f15956c07e4c02af4/src/settings.js#L91-L104

export function colorPicker(settingId, html) {
    const colorPickerElement = document.createElement("input");
    colorPickerElement.setAttribute("type", "color");
    colorPickerElement.setAttribute("data-edit", MODULE_ID + "." + settingId);
    colorPickerElement.value = game.settings.get(MODULE_ID, settingId);

    // Add color picker
    const stringInputElement = html[0].querySelector(`input[name="${MODULE_ID}.${settingId}"]`);
    stringInputElement.classList.add("color");
    stringInputElement.after(colorPickerElement);
}
