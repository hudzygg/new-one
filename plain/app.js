(function(){
	const cfg = window.SWIFTYY_CONFIG;
	const $ = (sel) => document.querySelector(sel);
	const $$ = (sel) => document.querySelectorAll(sel);
	const show = (el, v=true) => el && (el.style.display = v ? '' : 'none');
	const fmt = (n) => (typeof n === 'number' && Number.isFinite(n)) ? n.toLocaleString(undefined,{maximumFractionDigits:2}) : String(n);

	// Year
	$('#year').textContent = new Date().getFullYear();

	// Nav switching
	$$('.nav-item, .actions .btn, .tabs .tab').forEach(a => {
		a.addEventListener('click', (e)=>{
			const v = a.getAttribute('data-view');
			if(!v) return;
			e.preventDefault();
			switchView(v);
		});
	});

	function switchView(view){
		// sidebar active
		$$('.nav-item').forEach(i=> i.classList.toggle('active', i.getAttribute('data-view')===view));
		// content views
		show($('#view-dashboard'), view==='dashboard');
		show($('#view-alpha'), view==='alpha');
		show($('#view-settings'), view==='settings');
	}

	// DASHBOARD: market
	const filterInput = $('#market-filter');
	filterInput.value = 'bitcoin,ethereum,solana,binancecoin,cardano,toncoin,dogecoin,ripple';
	$('#market-refresh').addEventListener('click', fetchMarket);
	fetchMarket();

	async function fetchMarket(){
		const ids = filterInput.value.trim() || 'bitcoin,ethereum,solana,binancecoin,cardano,toncoin,dogecoin,ripple';
		show($('#market-error'), false);
		show($('#market-loading'), true);
		$('#market-list').innerHTML = '';
		try{
			const url = `${cfg.COINGECKO_BASE}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids)}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h,7d`;
			const res = await fetch(url);
			const data = await res.json();
			if(!res.ok) throw new Error(data?.error || 'Market fetch failed');
			renderMarket(Array.isArray(data)? data.slice(0,12) : []);
		}catch(e){
			$('#market-error').textContent = e.message;
			show($('#market-error'), true);
		}finally{ show($('#market-loading'), false); }
	}

	function renderMarket(list){
		const wrap = $('#market-list');
		wrap.innerHTML = '';
		list.forEach(c => {
			const card = document.createElement('div');
			card.className = 'card';
			card.innerHTML = `
				<div class="row" style="justify-content:space-between">
					<div style="font-weight:600">${c.name} <span class="label">(${(c.symbol||'').toUpperCase()})</span></div>
					<img src="${c.image}" alt="logo" width="24" height="24" style="border-radius:6px"/>
				</div>
				<div class="grid cols">
					<div class="card">Price: $${fmt(c.current_price)}</div>
					<div class="card">24h: ${fmt(c.price_change_percentage_24h)}%</div>
					<div class="card">7d: ${fmt(c.price_change_percentage_7d_in_currency)}%</div>
					<div class="card">Mkt Cap: $${fmt(c.market_cap)}</div>
					<div class="card">Vol 24h: $${fmt(c.total_volume)}</div>
				</div>
			`;
			wrap.appendChild(card);
		});
	}

	// ALPHA TRACKER: tabs
	$('#tab-summary').addEventListener('click', ()=> setAlphaTab('summary'));
	$('#tab-per').addEventListener('click', ()=> setAlphaTab('per'));
	$('#tab-alpha').addEventListener('click', ()=> setAlphaTab('alpha'));

	function setAlphaTab(tab){
		$$('#view-alpha .tabs .tab').forEach(b=> b.classList.remove('active'));
		document.getElementById(`tab-${tab}`).classList.add('active');
		show($('#alpha-summary'), tab==='summary');
		show($('#alpha-per'), tab==='per');
		show($('#alpha-alpha'), tab==='alpha');
		show($('#alpha-list'), tab==='alpha' && $('#alpha-list').children.length>0);
		show($('#alpha-more'), tab==='alpha' && $('#alpha-list').children.length>0);
	}

	// Alpha by token logic
	let alphaState = { wallets:[], nextOffset:0, token:'' };
	$('#alpha-scan').addEventListener('click', ()=> scanAlpha(0));
	$('#alpha-next').addEventListener('click', ()=> scanAlpha(alphaState.nextOffset||0));

	async function scanAlpha(offset){
		const token = $('#alpha-token').value.trim().toLowerCase();
		if(!token.startsWith('0x') || token.length!==42){
			$('#alpha-error').textContent = 'Please enter a valid token contract address (0x...)';
			show($('#alpha-error'), true); return;
		}
		show($('#alpha-error'), false);
		try{
			// Get main ETH pair via DexScreener
			const ds = await fetch(`${cfg.DEXSCREENER_BASE}/latest/dex/tokens/${token}`).then(r=>r.json());
			const ethPairs = (ds?.pairs||[]).filter(p=> p.chainId==='ethereum');
			if(!ethPairs.length) throw new Error('No mainnet pairs found');
			ethPairs.sort((a,b)=> (b?.liquidity?.usd||0)-(a?.liquidity?.usd||0));
			const pair = ethPairs[0];
			const pairAddr = (pair.pairAddress||'').toLowerCase();
			
			// Fetch first 200 token transfers
			const esParams = new URLSearchParams({
				module:'account', action:'tokentx', contractaddress:token,
				page:'1', offset:'200', sort:'asc'
			});
			if(cfg.ETHERSCAN_API_KEY) esParams.set('apikey', cfg.ETHERSCAN_API_KEY);
			const es = await fetch(`${cfg.ETHERSCAN_BASE}?${esParams}`).then(r=>r.json());
			if(es.status!=='1') throw new Error(es.message||'Etherscan error');
			const txs = es.result||[];
			const buyWallets = [];
			const seen = new Set();
			for(const t of txs){
				if((t.from||'').toLowerCase()===pairAddr){
					const toAddr = (t.to||'').toLowerCase();
					if(!seen.has(toAddr)){
						seen.add(toAddr);
						buyWallets.push(toAddr);
						if(buyWallets.length===200) break;
					}
				}
			}
			const start = Math.max(0, Number(offset)||0);
			const end = Math.min(start+10, buyWallets.length);
			const slice = buyWallets.slice(start, end);

			const listEl = $('#alpha-list');
			if(start===0){ listEl.innerHTML=''; }
			for(const w of slice){
				const row = document.createElement('div');
				row.className='card';
				row.style.display='flex'; row.style.justifyContent='space-between'; row.style.alignItems='center';
				row.innerHTML = `
					<div>
						<div style="font-weight:600">${w.slice(0,6)}...${w.slice(-4)}</div>
						<div class="label">Potential Alpha (quick check only)</div>
					</div>
					<div class="row">
						<a class="btn" target="_blank" href="https://etherscan.io/address/${w}">Etherscan</a>
					</div>
				`;
				listEl.appendChild(row);
			}
			alphaState = { wallets: buyWallets, nextOffset: end, token };
			show(listEl, listEl.children.length>0);
			show($('#alpha-more'), end<buyWallets.length);
		}catch(e){
			$('#alpha-error').textContent = e.message;
			show($('#alpha-error'), true);
		}
	}
})();