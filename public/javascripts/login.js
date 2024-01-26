let submit = document.getElementById('submit');
let username = document.getElementById('username');
let password = document.getElementById('password');

// submit.addEventListener("click", logIn);

async function logIn() {
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;

    this.submit();

    // let token = await axios.post('../users/login', { username, password }).then(res => { return res.data });
    // console.log(token);
    // if (token) {
    //     localStorage.setItem('biwithaggrid', token.token);
    //     axios.defaults.headers.common['Authorization'] = `Bearer ${token.token}`;
    //     // $.ajax({
    //     //     url: "../../main",
    //     //     type: 'GET',
    //     //     contentType: 'application/json',
    //     //     headers: {
    //     //         "Authorization": "Bearer " + token.token
    //     //     },
    //     //     async: false
    //     // });
    //     axios.get("../../main").then(res => (res.data));
    //     // window.location.href = "http://localhost:3000/main";
    // } else {
    //     alert("User Name OR User Password is not correct.");
    // }
}