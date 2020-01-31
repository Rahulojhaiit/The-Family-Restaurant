function scrollTo(id) {

  const element = document.getElementById(id);
  console.log(element);
  element.scrollIntoView();
}

//Get the button:
mybutton = document.getElementById("myBtn");

// When the user scrolls down 20px from the top of the document, show the button
window.onscroll = function() {
  scrollFunction()
};

function scrollFunction() {
  if (document.body.scrollTop > 500 || document.documentElement.scrollTop > 500) {
    mybutton.style.display = "block";
  } else {
    mybutton.style.display = "none";
  }
}

// When the user clicks on the button, scroll to the top of the document
function topFunction() {
  document.body.scrollTop = 0; // For Safari
  document.documentElement.scrollTop = 00; // For Chrome, Firefox, IE and Opera
}

$('#password2').on('keyup', function() {
  if ($('#password').val() == $('#password2').val()) {
    $('#message').html('Passwords matching').css('color', 'green');
  } else{
    $('#message').html('Passwords not matching').css('color', 'red');
}
});

//.min = new Date().toISOString().split("T")[0];
//datePickerId.min = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];

var today = new Date();
var dd = today.getDate();
var mm = today.getMonth()+1; //January is 0!
var yyyy = today.getFullYear();
 if(dd<10){
        dd='0'+dd
    }
    if(mm<10){
        mm='0'+mm
    }

today = yyyy+'-'+mm+'-'+dd;
document.getElementById("datePickerId").setAttribute("min", today);
