// Puxa a URL criptografada/salva localmente no navegador do usuário
let SCRIPT_URL = localStorage.getItem('mySheetsUrl') || "";

// Alimenta o input de configuração com a URL salva (se houver)
if (SCRIPT_URL) {
    document.getElementById('sheetsUrlInput').value = SCRIPT_URL;
}

// Inicializa com o que tiver no LocalStorage para o app abrir instantaneamente
let gastos = JSON.parse(localStorage.getItem('mygastos')) || [];

// Define data local de hoje no input sem quebrar fuso horário
const hojeLocal = new Date();
const ano = hojeLocal.getFullYear();
const mes = String(hojeLocal.getMonth() + 1).padStart(2, '0');
const dia = String(hojeLocal.getDate()).padStart(2, '0');
document.getElementById('gastoDate').value = `${ano}-${mes}-${dia}`;

// --- FUNÇÕES DE CONFIGURAÇÃO DO PAINEL ---

function toggleSettingsPanel() {
    const panel = document.getElementById('settingsPanel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function saveSettings() {
    const urlValue = document.getElementById('sheetsUrlInput').value.trim();
    if (urlValue === "") {
        localStorage.removeItem('mySheetsUrl');
        SCRIPT_URL = "";
        alert("URL removida. O app funcionará apenas de forma offline local.");
    } else {
        localStorage.setItem('mySheetsUrl', urlValue);
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
                gastos = data;
                saveToLocalStorage();
                rendergastos();
                checkgastosDueToday();
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
            gastos: gastos
        })
    })
    .then(res => res.json())
    .then(data => console.log("Planilha atualizada:", data))
    .catch(err => console.error("Erro na sincronização:", err));
}

// --- FUNÇÕES CORE DO SISTEMA ---

function handleFormSubmit(event) {
    event.preventDefault();

    const editIdInput = document.getElementById('editgastoId').value;
    const dateInput = document.getElementById('gastoDate').value;
    const descInput = document.getElementById('gastoDescription').value;
    const valueInput = parseFloat(document.getElementById('gastoValue').value);
    const isRecurrent = document.getElementById('gastoRecurrent').checked;

    if (editIdInput) {
        const idToEdit = parseInt(editIdInput);
        gastos = gastos.map(gasto => {
            if (gasto.id === idToEdit) {
                return {
                    ...gasto,
                    date: formatDateToDisplay(dateInput),
                    rawDate: dateInput,
                    description: descInput,
                    value: valueInput,
                    recurrent: isRecurrent
                };
            }
            return gasto;
        });
        cancelEdit();
    } else {
        const newgasto = {
            id: Date.now(),
            date: formatDateToDisplay(dateInput),
            rawDate: dateInput,
            description: descInput,
            value: valueInput,
            paid: false,
            recurrent: isRecurrent
        };
        gastos.push(newgasto);
    }

    saveToLocalStorage();
    rendergastos();
    sincronizarComPlanilha();

    document.getElementById('gastoDescription').value = '';
    document.getElementById('gastoValue').value = '';
    document.getElementById('gastoRecurrent').checked = false;
    document.getElementById('gastoDescription').focus();
}

function editgasto(id) {
    const gastoToEdit = gastos.find(gasto => gasto.id === id);
    if (!gastoToEdit) return;

    document.getElementById('formTitle').innerText = "Editar Dívida";
    document.getElementById('btnSubmit').innerText = "Salvar Alteração";
    document.getElementById('btnSubmit').style.backgroundColor = "#3498db";
    document.getElementById('btnCancel').style.display = "inline-block";

    document.getElementById('editgastoId').value = gastoToEdit.id;
    document.getElementById('gastoDate').value = gastoToEdit.rawDate;
    document.getElementById('gastoDescription').value = gastoToEdit.description;
    document.getElementById('gastoValue').value = gastoToEdit.value;
    document.getElementById('gastoRecurrent').checked = gastoToEdit.recurrent || false;

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    document.getElementById('formTitle').innerText = "Nova Dívida";
    document.getElementById('btnSubmit').innerText = "Adicionar";
    document.getElementById('btnSubmit').style.backgroundColor = "#2ecc71";
    document.getElementById('btnCancel').style.display = "none";

    document.getElementById('editgastoId').value = '';
    
    const hojeLocal = new Date();
    const ano = hojeLocal.getFullYear();
    const mes = String(hojeLocal.getMonth() + 1).padStart(2, '0');
    const dia = String(hojeLocal.getDate()).padStart(2, '0');
    document.getElementById('gastoDate').value = `${ano}-${mes}-${dia}`;
    
    document.getElementById('gastoDescription').value = '';
    document.getElementById('gastoValue').value = '';
    document.getElementById('gastoRecurrent').checked = false;
}

function deletegasto(id) {
    if (confirm("Tem certeza que deseja excluir esta dívida definitivamente?")) {
        const currentEditId = document.getElementById('editgastoId').value;
        if (currentEditId && parseInt(currentEditId) === id) {
            cancelEdit();
        }

        gastos = gastos.filter(gasto => gasto.id !== id);
        saveToLocalStorage();
        rendergastos();
        sincronizarComPlanilha();
    }
}

function togglePaid(id) {
    gastos = gastos.map(gasto => {
        if(gasto.id === id) {
            return { ...gasto, paid: !gasto.paid };
        }
        return gasto;
    });
    saveToLocalStorage();
    sincronizarComPlanilha();
    
    const showPaid = document.getElementById('showPaidToggle').checked;
    if (!showPaid) {
        setTimeout(rendergastos, 250);
    } else {
        rendergastos();
    }
}

function saveToLocalStorage() {
    localStorage.setItem('mygastos', JSON.stringify(gastos));
}

function formatDateToDisplay(dateString) {
    if(!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

function rendergastos() {
    const gastoList = document.getElementById('gastoList');
    const emptyMessage = document.getElementById('emptyMessage');
    const showPaid = document.getElementById('showPaidToggle').checked;
    
    gastoList.innerHTML = '';
    
    const filteredgastos = gastos.filter(gasto => showPaid ? true : !gasto.paid);
    
    let totalPending = gastos.reduce((acc, current) => !current.paid ? acc + current.value : acc, 0);
    document.getElementById('totalsWidget').innerText = `Total Pendente: ${totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;

    if (filteredgastos.length === 0) {
        emptyMessage.style.display = 'block';
        document.getElementById('gastosTable').style.display = 'none';
        return;
    }

    emptyMessage.style.display = 'none';
    document.getElementById('gastosTable').style.display = 'table';

    filteredgastos.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

    filteredgastos.forEach(gasto => {
        const tr = document.createElement('tr');
        if(gasto.paid) tr.classList.add('row-paid');

        tr.innerHTML = `
            <td class="checkbox-cell">
                <input type="checkbox" ${gasto.paid ? 'checked' : ''} onchange="togglePaid(${gasto.id})">
            </td>
            <td>${gasto.date}</td>
            <td>${gasto.description}</td>
            <td class="text-right">${gasto.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td class="actions-cell">
                <button class="btn-action btn-edit" onclick="editgasto(${gasto.id})">Editar</button>
                <button class="btn-action btn-delete" onclick="deletegasto(${gasto.id})">Excluir</button>
            </td>
        `;
        gastoList.appendChild(tr);
    });
}

function generateNextMonthgastos() {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); 

    const recurrentgastosFromThisMonth = gastos.filter(gasto => {
        if (!gasto.recurrent) return false;
        const parts = gasto.rawDate.split('-');
        const gastoYear = parseInt(parts[0], 10);
        const gastoMonth = parseInt(parts[1], 10) - 1; 
        return gastoMonth === mesAtual && gastoYear === anoAtual;
    });

    if (recurrentgastosFromThisMonth.length === 0) {
        const nomeMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        alert(`Nenhuma dívida marcada como recorrente foi encontrada para o mês atual (${nomeMeses[mesAtual]} de ${anoAtual}).`);
        return;
    }

    if (confirm(`Deseja copiar as ${recurrentgastosFromThisMonth.length} dívidas recorrentes deste mês para o mês seguinte?`)) {
        let count = 0;
        
        let proximoMesData = new Date(anoAtual, mesAtual + 1, 1);
        const anoProximo = proximoMesData.getFullYear();
        const mesProximo = proximoMesData.getMonth();

        const gastosAlreadyInNextMonth = gastos.filter(gasto => {
            const parts = gasto.rawDate.split('-');
            const dYear = parseInt(parts[0], 10);
            const dMonth = parseInt(parts[1], 10) - 1;
            return dMonth === mesProximo && dYear === anoProximo;
        });

        recurrentgastosFromThisMonth.forEach(gasto => {
            const jaExiste = gastosAlreadyInNextMonth.some(nextgasto => nextgasto.description.toLowerCase() === gasto.description.toLowerCase());
            
            if (!jaExiste) {
                const parts = gasto.rawDate.split('-');
                let itemDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                
                itemDate.setMonth(itemDate.getMonth() + 1);
                
                const nextYear = itemDate.getFullYear();
                const nextMonth = String(itemDate.getMonth() + 1).padStart(2, '0');
                const nextDay = String(itemDate.getDate()).padStart(2, '0');
                const nextRawDate = `${nextYear}-${nextMonth}-${nextDay}`;

                const clonedgasto = {
                    id: Date.now() + count, 
                    date: `${nextDay}/${nextMonth}/${nextYear}`,
                    rawDate: nextRawDate,
                    description: gasto.description,
                    value: gasto.value,
                    paid: false,       
                    recurrent: true    
                };

                gastos.push(clonedgasto);
                count++;
            }
        });

        saveToLocalStorage();
        rendergastos();
        sincronizarComPlanilha();

        if (count === 0) {
            alert("As dívidas recorrentes deste mês já tinham sido copiadas para o mês seguinte.");
        } else {
            alert(`Sucesso! ${count} dívidas recorrentes foram replicadas para o próximo mês.`);
        }
    }
}

function checkgastosDueToday() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    const dataHojeFormatada = `${ano}-${mes}-${dia}`;

    const dividasDeHoje = gastos.filter(gasto => {
        return gasto.rawDate === dataHojeFormatada && !gasto.paid;
    });

    if (dividasDeHoje.length > 0) {
        const listContainer = document.getElementById('alertgastosList');
        listContainer.innerHTML = ''; 

        dividasDeHoje.forEach(gasto => {
            const li = document.createElement('li');
            const valorFormatado = gasto.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            li.innerHTML = `<span>• ${gasto.description}</span><span class="gasto-value">${valorFormatado}</span>`;
            listContainer.appendChild(li);
        });

        document.getElementById('customAlertModal').style.display = 'flex';
    }
}

function closeCustomAlert() {
    document.getElementById('customAlertModal').style.display = 'none';
}

// Inicialização síncrona local
rendergastos();
checkgastosDueToday();

// Inicialização remota assíncrona
carregarDadosDaPlanilha();