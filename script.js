const menuButton = document.getElementsByID("menuButton")
const naviList = document.getElementById("navi-list")

menuButton.addEventListener('click', () => {
    naviList.classList.toggle('active');
})