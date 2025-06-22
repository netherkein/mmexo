// PASSO 1: Adiciona os novos campos ao modelo de dados do personagem.
Hooks.once('init', () => {
    console.log('M&M 3e Regras EXO | Adicionando campos de dados ao modelo...');
    const characterDataModel = CONFIG.Actor.dataModels.personnage;

    if (characterDataModel) {
        const originalSchema = characterDataModel.defineSchema;
        characterDataModel.defineSchema = function() {
            const schema = originalSchema.call(this);
            schema.estresse = new foundry.data.fields.NumberField({ required: true, integer: true, initial: 0, min: 0 });
            schema.corrupcao = new foundry.data.fields.NumberField({ required: true, integer: true, initial: 0, min: 0 });
            return schema;
        };
    }
});

// PASSO 2: Ações que ocorrem quando o jogo está 100% pronto.
Hooks.once('ready', async () => {
    console.log("M&M 3e Regras EXO | Jogo pronto. Corrigindo atores e aplicando patches...");

    // Migração para corrigir atores existentes sem os novos campos.
    const updates = [];
    for (const actor of game.actors.filter(a => a.type === 'personnage')) {
        const update = {};
        if (foundry.utils.getProperty(actor.system, "estresse") === undefined) {
            update['system.estresse'] = 0;
        }
        if (foundry.utils.getProperty(actor.system, "corrupcao") === undefined) {
            update['system.corrupcao'] = 0;
        }
        if (Object.keys(update).length > 0) {
            update['_id'] = actor.id;
            updates.push(update);
        }
    }
    if (updates.length > 0) {
        console.log(`M&M 3e Regras EXO | Atualizando ${updates.length} atores antigos...`);
        await Actor.updateDocuments(updates);
        ui.notifications.info("Módulo EXO: Personagens antigos foram atualizados com sucesso!");
    }
    
    // Wrapper para a penalidade, agora com o caminho CORRETO.
    if (typeof libWrapper === 'function') {
        libWrapper.register('mm3e-regras-exo', 'CONFIG.Actor.documentClass.prototype.prepareDerivedData', function(wrapped, ...args) {
            wrapped.apply(this, args);

            try {
                const system = this.system;

                // CORREÇÃO AQUI: system.defense (singular)
                if (system.estresse > 0) {
                    system.defense.volonte.total -= system.estresse;
                }
                // CORREÇÃO AQUI: system.defense (singular)
                if (system.corrupcao > 0) {
                    system.defense.vigueur.total -= system.corrupcao;
                }
            } catch (e) {
                console.error("M&M 3e Regras EXO | Erro ao aplicar penalidades de defesa:", e);
            }
        }, 'WRAPPER');
        console.log('M&M 3e Regras EXO | Penalidades passivas aplicadas com sucesso.');
    } else {
        ui.notifications.error("Módulo EXO: libWrapper não está ativo. As penalidades não funcionarão.");
    }
});

// PASSO 3: Injeta o HTML na ficha para exibir os campos.
Hooks.on('renderPersonnageActorSheet', (sheet, html, data) => {
    const targetDiv = html.find('.tab.caracteristiques .col:first-child .points');
    if (targetDiv.length === 0 || html.find('.pontos-exo').length > 0) return;

    const customFieldsHTML = `
        <div class="pontos-exo" style="display: grid; grid-template-columns: 50% 50%; border: 2px solid black; margin-top: 5px;">
            <div style="display: grid; grid-template-rows: max-content 1fr; text-align: center; gap: 5px; padding: 5px;">
                <span>Estresse</span>
                <input type="number" name="system.estresse" value="${data.actor.system.estresse}" min="0" style="text-align: center; background: transparent; border: none; font-family: Sriracha; color: inherit;" />
            </div>
            <div style="display: grid; grid-template-rows: max-content 1fr; text-align: center; gap: 5px; border-left: 2px solid black; padding: 5px;">
                <span>Corrupção</span>
                <input type="number" name="system.corrupcao" value="${data.actor.system.corrupcao}" min="0" style="text-align: center; background: transparent; border: none; font-family: Sriracha; color: inherit;" />
            </div>
        </div>
    `;
    targetDiv.after(customFieldsHTML);
});