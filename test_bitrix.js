const url = "https://pcicrm.bitrix24.com/rest/11/01finquajfj22z2p/crm.product.get.json";

async function run() {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 14673 })
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

run();
