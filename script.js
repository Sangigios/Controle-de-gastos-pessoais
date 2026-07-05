// MODIFICADO: Chaves com sufixo '_app2' para isolar o segundo aplicativo
let SCRIPT_URL = localStorage.getItem('mySheetsUrl_app2') || "";

if (SCRIPT_URL) {
    document.getElementById('sheetsUrlInput').value = SCRIPT_URL;
}

// MODIFICADO: Puxa as dívidas da nova chave independente
let debts = JSON.parse(localStorage.getItem('myDebts_app2')) || [];

// Define data local de hoje no input sem quebrar fuso horário
const hojeLocal = new Date();
const ano = hojeLocal.getFullYear();
const mes = String(hojeLocal.getMonth() + 1).padStart(2, '0');
const dia = String(hojeLocal.getDate()).padStart(2, '0');
document.getElementById('debtDate').value = `${ano}-${mes}-${dia}`;

// --- FUNÇÕES DE CONFIGURAÇÃO DO PAINEL ---

function toggleSettingsPanel() {
    const panel = document.getElementById('settingsPanel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function saveSettings() {
    const urlValue = document.getElementById('sheetsUrlInput').value.trim();
    if (urlValue === "") {
        // MODIFICADO: Remove da chave do app 2
        localStorage.removeItem('mySheetsUrl_app2');
        SCRIPT_URL = "";
        alert("URL removida. O app funcionará apenas de forma offline local.");
    } else {
        // MODIFICADO: Salva na chave do app 2
        localStorage.setItem('mySheetsUrl_app2', urlValue);
        SCRIPT_URL = urlValue;
        alert("Configuração de nuvem salva com sucesso! Sincronizando dados...");
        carregarDadosDaPlanilha();
    }
    toggleSettingsPanel();
}

// --- FUNÇÕES DE INTEGRAÇÃO COM O GOOGLE SHEETS ---

function carregarDadosDaPlanilha() {
    if (!SCRIPT_URL) return;

    fetch(SCRIPT_URL)
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data)) {
                debts = data;
                saveToLocalStorage();
                renderDebts();
                checkDebtsDueToday();
                console.log("Dados sincronizados da planilha com sucesso!");
            }
        })
        .catch(error => console.error("Erro ao carregar dados da planilha:", error));
}

function sincronizarComPlanilha() {
    if (!SCRIPT_URL) return;

    console.log("Sincronizando com a planilha em segundo plano...");
    
    fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
            action: "syncAll",
            debts: debts
        })
    })
    .then(res => res.json())
    .then(data => console.log("Planilha atualizada:", data))
    .catch(err => console.error("Erro na sincronização:", err));
}

// --- FUNÇÕES CORE DO SISTEMA ---

function handleFormSubmit(event) {
    event.preventDefault();

    const editIdInput = document.getElementById('editDebtId').value;
    const dateInput = document.getElementById('debtDate').value;
    const descInput = document.getElementById('debtDescription').value;
    const valueInput = parseFloat(document.getElementById('debtValue').value);
    const isRecurrent = document.getElementById('debtRecurrent').checked;

    if (editIdInput) {
        const idToEdit = parseInt(editIdInput);
        debts = debts.map(debt => {
            if (debt.id === idToEdit) {
                return {
                    ...debt,
                    date: formatDateToDisplay(dateInput),
                    rawDate: dateInput,
                    description: descInput,
                    value: valueInput,
                    recurrent: isRecurrent
                };
            }
            return debt;
        });
        cancelEdit();
    } else {
        const newDebt = {
            id: Date.now(),
            date: formatDateToDisplay(dateInput),
            rawDate: dateInput,
            description: descInput,
            value: valueInput,
            paid: false,
            recurrent: isRecurrent
        };
        debts.push(newDebt);
    }

    saveToLocalStorage();
    renderDebts();
    sincronizarComPlanilha();

    document.getElementById('debtDescription').value = '';
    document.getElementById('debtValue').value = '';
    document.getElementById('debtRecurrent').checked = false;
    document.getElementById('debtDescription').focus();
}

function editDebt(id) {
    const debtToEdit = debts.find(debt => debt.id === id);
    if (!debtToEdit) return;

    document.getElementById('formTitle').innerText = "Editar Dívida";
    document.getElementById('btnSubmit').innerText = "Salvar Alteração";
    document.getElementById('btnSubmit').style.backgroundColor = "#3498db";
    document.getElementById('btnCancel').style.display = "inline-block";

    document.getElementById('editDebtId').value = debtToEdit.id;
    document.getElementById('debtDate').value = debtToEdit.rawDate;
    document.getElementById('debtDescription').value = debtToEdit.description;
    document.getElementById('debtValue').value = debtToEdit.value;
    document.getElementById('debtRecurrent').checked = debtToEdit.recurrent || false;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    document.getElementById('formTitle').innerText = "Nova Dívida";
    document.getElementById('btnSubmit').innerText = "Adicionar";
    document.getElementById('btnSubmit').style.backgroundColor = "#2ecc71";
    document.getElementById('btnCancel').style.display = "none";

    document.getElementById('editDebtId').value = '';
    
    const hojeLocal = new Date();
    const ano = hojeLocal.getFullYear();
    const mes = String(hojeLocal.getMonth() + 1).padStart(2, '0');
    const dia = String(hojeLocal.getDate()).padStart(2, '0');
    document.getElementById('debtDate').value = `${ano}-${mes}-${dia}`;
    
    document.getElementById('debtDescription').value = '';
    document.getElementById('debtValue').value = '';
    document.getElementById('debtRecurrent').checked = false;
}

function deleteDebt(id) {
    if (confirm("Tem certeza que deseja excluir esta dívida definitivamente?")) {
        const currentEditId = document.getElementById('editDebtId').value;
        if (currentEditId && parseInt(currentEditId) === id) {
            cancelEdit();
        }

        debts = debts.filter(debt => debt.id !== id);
        saveToLocalStorage();
        renderDebts();
        sincronizarComPlanilha();
    }
}

function togglePaid(id) {
    debts = debts.map(debt => {
        if(debt.id === id) {
            return { ...debt, paid: !debt.paid };
        }
        return debt;
    });
    saveToLocalStorage();
    sincronizarComPlanilha();
    
    const showPaid = document.getElementById('showPaidToggle').checked;
    if (!showPaid) {
        setTimeout(renderDebts, 250);
    } else {
        renderDebts();
    }
}

function saveToLocalStorage() {
    // MODIFICADO: Salva a lista de dívidas na chave separada do app 2
    localStorage.setItem('myDebts_app2', JSON.stringify(debts));
}

function formatDateToDisplay(dateString) {
    if(!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function renderDebts() {
    const debtList = document.getElementById('debtList');
    const emptyMessage = document.getElementById('emptyMessage');
    const showPaid = document.getElementById('showPaidToggle').checked;
    
    debtList.innerHTML = '';
    
    const filteredDebts = debts.filter(debt => showPaid ? true : !debt.paid);
    
    let totalPending = debts.reduce((acc, current) => !current.paid ? acc + current.value : acc, 0);
    document.getElementById('totalsWidget').innerText = `Total Pendente: ${totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;

    if (filteredDebts.length === 0) {
        emptyMessage.style.display = 'block';
        document.getElementById('debtsTable').style.display = 'none';
        return;
    }

    emptyMessage.style.display = 'none';
    document.getElementById('debtsTable').style.display = 'table';

    filteredDebts.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

    filteredDebts.forEach(debt => {
        const tr = document.createElement('tr');
        if(debt.paid) tr.classList.add('row-paid');

        tr.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" ${debt.paid ? 'checked' : ''} onchange="togglePaid(${debt.id})">
            </td>
            <td>${debt.date}</td>
            <td>${debt.description}</td>
            <td class="text-right">${debt.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td class="actions-cell">
                <button class="btn-action btn-edit" onclick="editDebt(${debt.id})">Editar</button>
                <button class="btn-action btn-delete" onclick="deleteDebt(${debt.id})">Excluir</button>
            </td>
        `;
        debtList.appendChild(tr);
    });
}

function generateNextMonthDebts() {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); 

    const recurrentDebtsFromThisMonth = debts.filter(debt => {
        if (!debt.recurrent) return false;
        const parts = debt.rawDate.split('-');
        const debtYear = parseInt(parts[0], 10);
        const debtMonth = parseInt(parts[1], 10) - 1; 
        return debtMonth === mesAtual && debtYear === anoAtual;
    });

    if (recurrentDebtsFromThisMonth.length === 0) {
        const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        alert(`Nenhuma dívida marcada como recorrente foi encontrada para o mês atual (${nomeMeses[mesAtual]} de ${anoAtual}).`);
        return;
    }

    if (confirm(`Deseja copiar as ${recurrentDebtsFromThisMonth.length} dívidas recorrentes deste mês para o mês seguinte?`)) {
        let count = 0;
        
        let proximoMesData = new Date(anoAtual, mesAtual + 1, 1);
        const anoProximo = proximoMesData.getFullYear();
        const mesProximo = proximoMesData.getMonth();

        const debtsAlreadyInNextMonth = debts.filter(debt => {
            const parts = debt.rawDate.split('-');
            const dYear = parseInt(parts[0], 10);
            const dMonth = parseInt(parts[1], 10) - 1;
            return dMonth === mesProximo && dYear === anoProximo;
        });

        recurrentDebtsFromThisMonth.forEach(debt => {
            const jaExiste = debtsAlreadyInNextMonth.some(nextDebt => nextDebt.description.toLowerCase() === debt.description.toLowerCase());
            
            if (!jaExiste) {
                const parts = debt.rawDate.split('-');
                let itemDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                
                itemDate.setMonth(itemDate.getMonth() + 1);
                
                const nextYear = itemDate.getFullYear();
                const nextMonth = String(itemDate.getMonth() + 1).padStart(2, '0');
                const nextDay = String(itemDate.getDate()).padStart(2, '0');
                const nextRawDate = `${nextYear}-${nextMonth}-${nextDay}`;

                const clonedDebt = {
                    id: Date.now() + count, 
                    date: `${nextDay}/${nextMonth}/${nextYear}`,
                    rawDate: nextRawDate,
                    description: debt.description,
                    value: debt.value,
                    paid: false,       
                    recurrent: true    
                };

                debts.push(clonedDebt);
                count++;
            }
        });

        saveToLocalStorage();
        renderDebts();
        sincronizarComPlanilha();

        if (count === 0) {
            alert("As dívidas recorrentes deste mês já tinham sido copiadas para o mês seguinte.");
        } else {
            alert(`Sucesso! ${count} dívidas recorrentes foram replicadas para o próximo mês.`);
        }
    }
}

function checkDebtsDueToday() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataHojeFormatada = `${ano}-${mes}-${dia}`;

    const dividasDeHoje = debts.filter(debt => {
        return debt.rawDate === dataHojeFormatada && !debt.paid;
    });

    if (dividasDeHoje.length > 0) {
        const listContainer = document.getElementById('alertDebtsList');
        listContainer.innerHTML = ''; 

        dividasDeHoje.forEach(debt => {
            const li = document.createElement('li');
            const valorFormatado = debt.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            li.innerHTML = `<span>• ${debt.description}</span><span class="debt-value">${valorFormatado}</span>`;
            listContainer.appendChild(li);
        });

        document.getElementById('customAlertModal').style.display = 'flex';
    }
}

function closeCustomAlert() {
    document.getElementById('customAlertModal').style.display = 'none';
}

// Inicialização síncrona local
renderDebts();
checkDebtsDueToday();

// Inicialização remota assíncrona
carregarDadosDaPlanilha();