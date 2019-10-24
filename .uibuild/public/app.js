function renderTime() {
    setTimeout(() => {
        document.body.innerHTML = document.body.innerHTML.replace(/\[Time([0-9]+)\]/g, str => {
            console.log(str);
            let t = /\[Time([0-9]+)\]/.exec(str);
            return new Date(t[1] * 1000).toLocaleTimeString();
        })
    }, 300);
}
document.onreadystatechange = renderTime;