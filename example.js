var Oracle = require("./src/oci")

new Oracle({
  "tenancy": "<sua tenancy ocid>",
  "fingerprint": "00:00:00:00:00:00:00:v:00:00:00:00:00:00:00:00",
  "private_key": "<sua chave>",
  "region": "sua regiao",
  "user": "ocid do usuario"
}).then(oci=>{
  oci.setRegion("<region>").getCpuUsage("ocid da instancia",7).then(result=>{
    console.log(result)
  }).catch(error=>{
    console.log(error)
  })
})