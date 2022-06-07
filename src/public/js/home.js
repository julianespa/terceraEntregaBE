fetch('/req').then(r=>r.json()).then(user=>{
    console.log(user)

    let imgDiv = document.getElementById('img')
    let img = document.createElement('img')
    img.src = user.file
    imgDiv.append(img)
    let nameDiv = document.getElementById('name')
    let name = document.createElement('p')
    name.innerHTML = `Hello ${user.name}`
    nameDiv.append(name)
})






