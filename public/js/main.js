
  var pecas = [];
  var config = {};
  var orcamentos = [];
  var modalOrcAtual = null;

  async function init() {
    try {
      const token = localStorage.getItem('token');
      const [configRes, orcRes] = await Promise.all([
        fetch('/api/config', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/orcamentos', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      if (configRes.ok) config = await configRes.json();
      if (orcRes.ok) orcamentos = await orcRes.json();
      
      document.getElementById('cfgEmpresa').value = config.empresa || '';
      document.getElementById('cfgTelefone').value = config.telefone || '';
      document.getElementById('cfgCidade').value = config.cidade || '';
      document.getElementById('cfgMargem').value = config.margem || 0;
      document.getElementById('cfgDesconto').value = config.desconto || 0;
      document.getElementById('margem').value = config.margem || 0;
      document.getElementById('desconto').value = config.desconto || 0;
      
      var headerH1 = document.querySelector('header h1');
      if (config.empresa) headerH1.textContent = config.empresa;
    } catch (err) {
      console.error('Erro ao inicializar dados', err);
    }

    document.getElementById('pecaTipo').addEventListener('change', onTipoChange);
    document.getElementById('largura').addEventListener('input', atualizarArea);
    document.getElementById('altura').addEventListener('input', atualizarArea);
    document.getElementById('desconto').addEventListener('input', calcTotal);
    document.getElementById('margem').addEventListener('input', calcTotal);
    document.getElementById('pecaUnidade').addEventListener('change', function() {
      var qtdInput = document.getElementById('pecaQtd');
      if (this.value === 'un') {
        qtdInput.step = '1';
        qtdInput.min = '1';
        if (qtdInput.value) {
          qtdInput.value = Math.round(parseFloat(qtdInput.value)) || 1;
        }
      } else {
        qtdInput.step = '0.01';
        qtdInput.min = '0.01';
      }
    });
  }

  async function salvarConfig() {
    config.empresa = document.getElementById('cfgEmpresa').value;
    config.telefone = document.getElementById('cfgTelefone').value;
    config.cidade = document.getElementById('cfgCidade').value;
    config.margem = parseFloat(document.getElementById('cfgMargem').value) || 0;
    config.desconto = parseFloat(document.getElementById('cfgDesconto').value) || 0;
    
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(config)
      });
    } catch (err) {
      console.error('Erro ao salvar config', err);
    }

    var headerH1 = document.querySelector('header h1');
    if (config.empresa) headerH1.textContent = config.empresa;
  }

  function showPage(id) {
    document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
    document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('active'); });
    document.getElementById('page-' + id).classList.add('active');
    var tabs = document.querySelectorAll('.tab');
    var map = { novo: 0, salvos: 1, config: 2 };
    tabs[map[id]].classList.add('active');
    if (id === 'salvos') renderSalvos();
  }

  function onTipoChange() {
    var val = document.getElementById('pecaTipo').value;
    document.getElementById('pecaNomeCustom').style.display = val === 'Outro' ? 'block' : 'none';
  }

  function atualizarArea() {
    var l = parseFloat(document.getElementById('largura').value) || 0;
    var a = parseFloat(document.getElementById('altura').value) || 0;
    var el = document.getElementById('areaCalc');
    if (l && a) {
      el.textContent = 'Área: ' + (l * a).toFixed(2) + ' m²  |  Perímetro: ' + (2 * (l + a)).toFixed(2) + ' m';
    } else {
      el.textContent = '';
    }
  }

  function adicionarPeca() {
    var tipo = document.getElementById('pecaTipo').value;
    var nome = tipo === 'Outro' ? document.getElementById('pecaNomeInput').value.trim() : tipo;
    var qtd = parseFloat(document.getElementById('pecaQtd').value);
    var preco = parseFloat(document.getElementById('pecaPreco').value);
    var unidade = document.getElementById('pecaUnidade').value;
    if (!nome) { alert('Selecione ou digite o tipo de item.'); return; }
    if (!qtd || qtd <= 0) { alert('Informe a quantidade.'); return; }
    if (unidade === 'un' && !Number.isInteger(qtd)) { alert('A quantidade para a unidade "un" deve ser um número inteiro.'); return; }
    if (!preco || preco <= 0) { alert('Informe o preço unitário.'); return; }
    pecas.push({ nome: nome, qtd: qtd, unidade: unidade, preco: preco });
    document.getElementById('pecaTipo').value = '';
    document.getElementById('pecaNomeInput').value = '';
    document.getElementById('pecaQtd').value = '';
    document.getElementById('pecaPreco').value = '';
    document.getElementById('pecaNomeCustom').style.display = 'none';
    renderPecas();
    calcTotal();
  }

  function removerPeca(i) {
    pecas.splice(i, 1);
    renderPecas();
    calcTotal();
  }

  function renderPecas() {
    var list = document.getElementById('pecasList');
    var card = document.getElementById('listaCard');
    if (pecas.length === 0) { card.style.display = 'none'; list.innerHTML = ''; return; }
    card.style.display = 'block';
    list.innerHTML = pecas.map(function(p, i) {
      return '<div class="peca-item">' +
        '<div class="peca-info">' +
          '<div class="peca-nome">' + esc(p.nome) + '</div>' +
          '<div class="peca-detalhe">' + fmt(p.qtd) + ' ' + p.unidade + ' × R$ ' + fmt2(p.preco) + '</div>' +
        '</div>' +
        '<div class="peca-preco">R$ ' + fmt2(p.qtd * p.preco) + '</div>' +
        '<button class="peca-del" onclick="removerPeca(' + i + ')" aria-label="Remover">×</button>' +
      '</div>';
    }).join('');
  }

  function calcTotal() {
    var sub = pecas.reduce(function(s, p){ return s + p.qtd * p.preco; }, 0);
    var desc = parseFloat(document.getElementById('desconto').value) || 0;
    var marg = parseFloat(document.getElementById('margem').value) || 0;
    var descVal = sub * (desc / 100);
    var margVal = (sub - descVal) * (marg / 100);
    var total = sub - descVal + margVal;
    document.getElementById('subtotalVal').textContent = 'R$ ' + fmt2(sub);
    document.getElementById('descontoVal').textContent = '- R$ ' + fmt2(descVal);
    document.getElementById('margemVal').textContent = '+ R$ ' + fmt2(margVal);
    document.getElementById('totalVal').textContent = 'R$ ' + fmt2(total);
    return { sub: sub, descVal: descVal, margVal: margVal, total: total };
  }

  async function salvarOrcamento() {
    var cliente = document.getElementById('clienteNome').value.trim();
    var produto = document.getElementById('clienteProduto').value.trim();
    var largura = parseFloat(document.getElementById('largura').value) || 0;
    var altura = parseFloat(document.getElementById('altura').value) || 0;
    if (!cliente) { alert('Informe o nome do cliente.'); return; }
    if (pecas.length === 0) { alert('Adicione pelo menos um item.'); return; }
    var totais = calcTotal();
    var desc = parseFloat(document.getElementById('desconto').value) || 0;
    var marg = parseFloat(document.getElementById('margem').value) || 0;
    
    var orc = {
      data: new Date().toLocaleDateString('pt-BR'),
      cliente: cliente,
      produto: produto,
      largura: largura,
      altura: altura,
      pecas: pecas,
      desconto: desc,
      margem: marg,
      totais: totais
    };
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/orcamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(orc)
      });
      if (res.ok) {
        const savedOrc = await res.json();
        orcamentos.unshift(savedOrc);
        alert('Orçamento salvo!');
        limparForm();
      } else {
        alert('Erro ao salvar orçamento.');
      }
    } catch (err) {
      console.error('Erro ao salvar orçamento', err);
      alert('Erro de conexão ao salvar.');
    }
  }

  function limparForm() {
    pecas = [];
    document.getElementById('clienteNome').value = '';
    document.getElementById('clienteProduto').value = '';
    document.getElementById('largura').value = '';
    document.getElementById('altura').value = '';
    document.getElementById('areaCalc').textContent = '';
    document.getElementById('desconto').value = config.desconto || 0;
    document.getElementById('margem').value = config.margem || 0;
    renderPecas();
    calcTotal();
  }

  function renderSalvos() {
    var el = document.getElementById('savedList');
    if (orcamentos.length === 0) {
      el.innerHTML = '<div class="empty">Nenhum orçamento salvo ainda.</div>';
      return;
    }
    el.innerHTML = orcamentos.map(function(o) {
      return '<div class="orcamento-salvo">' +
        '<div class="orc-header">' +
          '<div><div class="orc-titulo">' + esc(o.cliente) + '</div>' +
          (o.produto ? '<div style="font-size:13px;color:var(--text3);">' + esc(o.produto) + '</div>' : '') +
          '</div>' +
          '<div class="orc-data">' + o.data + '</div>' +
        '</div>' +
        '<div class="orc-total">R$ ' + fmt2(o.totais.total) + '</div>' +
        '<div class="orc-acoes">' +
          '<button onclick="verOrcamento(\'' + o.id + '\')">Ver detalhes</button>' +
          '<button class="del" onclick="excluirOrcamento(\'' + o.id + '\')">Excluir</button>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function verOrcamento(id) {
    var o = orcamentos.find(function(x){ return x.id === id; });
    if (!o) return;
    modalOrcAtual = o;
    document.getElementById('modalTitulo').textContent = o.cliente;
    var html = '<div style="font-size:13px;color:var(--text3);margin-bottom:12px;">' + o.data;
    if (o.produto) html += ' · ' + esc(o.produto);
    html += '</div>';
    if (o.largura && o.altura) {
      html += '<div style="background:var(--surface2);border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:13px;">' +
        '<span style="color:var(--text2);">Medidas: </span>' + fmt(o.largura) + ' m × ' + fmt(o.altura) + ' m = ' + fmt2(o.largura * o.altura) + ' m²' +
      '</div>';
    }
    html += '<div class="pecas-list" style="margin-bottom:12px;">';
    o.pecas.forEach(function(p) {
      html += '<div class="peca-item">' +
        '<div class="peca-info"><div class="peca-nome">' + esc(p.nome) + '</div>' +
        '<div class="peca-detalhe">' + fmt(p.qtd) + ' ' + p.unidade + ' × R$ ' + fmt2(p.preco) + '</div></div>' +
        '<div class="peca-preco">R$ ' + fmt2(p.qtd * p.preco) + '</div>' +
      '</div>';
    });
    html += '</div>';
    html += '<div class="total-box">' +
      '<div class="total-row"><span class="total-label">Subtotal</span><span>R$ ' + fmt2(o.totais.sub) + '</span></div>' +
      '<div class="total-row"><span class="total-label">Desconto (' + o.desconto + '%)</span><span style="color:var(--danger);">- R$ ' + fmt2(o.totais.descVal) + '</span></div>' +
      '<div class="total-row"><span class="total-label">Margem (' + o.margem + '%)</span><span style="color:var(--success);">+ R$ ' + fmt2(o.totais.margVal) + '</span></div>' +
      '<div class="total-row main"><span>Total</span><span>R$ ' + fmt2(o.totais.total) + '</span></div>' +
    '</div>';
    document.getElementById('modalConteudo').innerHTML = html;
    document.getElementById('modalVer').classList.add('open');
  }

  function fecharModal() {
    document.getElementById('modalVer').classList.remove('open');
    modalOrcAtual = null;
  }

  async function excluirOrcamento(id) {
    if (!confirm('Excluir este orçamento?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orcamentos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        orcamentos = orcamentos.filter(function(o){ return o.id !== id; });
        renderSalvos();
      } else {
        alert('Erro ao excluir.');
      }
    } catch (err) {
      console.error('Erro ao excluir', err);
      alert('Erro ao conectar ao servidor.');
    }
  }

  function imprimirOrcamento() {
    if (!modalOrcAtual) return;
    var o = modalOrcAtual;
    var nome = config.empresa || 'Alumínio';
    var tel = config.telefone ? '\nTel: ' + config.telefone : '';
    var cidade = config.cidade ? '\n' + config.cidade : '';
    var itens = o.pecas.map(function(p){
      return p.nome + ': ' + fmt(p.qtd) + ' ' + p.unidade + ' × R$' + fmt2(p.preco) + ' = R$' + fmt2(p.qtd * p.preco);
    }).join('\n');
    var medidas = (o.largura && o.altura) ? '\nMedidas: ' + o.largura + 'm × ' + o.altura + 'm' : '';
    var texto = '=== ORÇAMENTO ===\n' + nome + tel + cidade + '\n\nData: ' + o.data +
      '\nCliente: ' + o.cliente +
      (o.produto ? '\nProduto: ' + o.produto : '') +
      medidas +
      '\n\n--- ITENS ---\n' + itens +
      '\n\n--- TOTAIS ---' +
      '\nSubtotal: R$ ' + fmt2(o.totais.sub) +
      '\nDesconto: - R$ ' + fmt2(o.totais.descVal) +
      '\nMargem: + R$ ' + fmt2(o.totais.margVal) +
      '\nTOTAL: R$ ' + fmt2(o.totais.total) +
      '\n\nObrigado pela preferência!';
    if (navigator.share) {
      navigator.share({ title: 'Orçamento - ' + o.cliente, text: texto }).catch(function(){});
    } else {
      var w = window.open('', '_blank');
      w.document.write('<pre style="font-family:monospace;padding:20px;white-space:pre-wrap;">' + texto + '</pre>');
      w.print();
    }
  }

  function fmt(n) { return parseFloat(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 }); }
  function fmt2(n) { return parseFloat(n).toFixed(2).replace('.', ','); }
  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  document.getElementById('modalVer').addEventListener('click', function(e){ if (e.target === this) fecharModal(); });

  init();
