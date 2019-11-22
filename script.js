function getUrlVars() {
  var vars = {};
  var parts = window.location.href.replace(
      /[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
        vars[key] = value;
      });
  return vars;
}



// INITIALIZE SPEEDTEST
var s = new Speedtest();  // create speedtest object

s.onupdate = function(data) {
  // callback to update data in UI
  document.getElementById('ip').textContent = data.clientIp;
  document.getElementById('dlText').textContent =
      data.testState == 1 && data.dlStatus == 0 ? '...' : data.dlStatus;
  document.getElementById('ulText').textContent =
      data.testState == 3 && data.ulStatus == 0 ? '...' : data.ulStatus;
  document.getElementById('pingText').textContent = data.pingStatus;
  document.getElementById('jitText').textContent = data.jitterStatus;

  let urlVars = getUrlVars();

  if (data.testState === 4) {
    $.post('backend/record.php', {
      id: urlVars.id,
      dlStatus: data.dlStatus,
      ulStatus: data.ulStatus,
      pingStatus: data.pingStatus,
      jitterStatus: data.jitterStatus
    });
  }
};

s.onend = function(aborted) {
  // callback for test ended/aborted
  document.getElementById('startStopBtn').className =
      '';  // show start button again
  if (aborted) {
    // if the test was aborted, clear the UI and prepare for new test
    initUI();
  }
};

function startStop() {
  // start/stop button pressed
  if (s.getState() == 3) {
    // speedtest is running, abort
    s.abort();
  } else {
    // test is not running, begin
    s.start();
    document.getElementById('startStopBtn').className = 'running';
  }
}

// function to (re)initialize UI
function initUI() {
  document.getElementById('dlText').textContent = '';
  document.getElementById('ulText').textContent = '';
  document.getElementById('pingText').textContent = '';
  document.getElementById('jitText').textContent = '';
  document.getElementById('ip').textContent = '';
}



window.onload = function() {
  initUI();
};