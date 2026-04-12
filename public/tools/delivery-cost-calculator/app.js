(function () {
  var distance = document.getElementById("distanceKm");
  var costPerKm = document.getElementById("costPerKm");
  var fuel = document.getElementById("fuelCost");
  var labor = document.getElementById("laborCost");
  var vehicle = document.getElementById("vehicleType");
  var numDel = document.getElementById("numDeliveries");
  var overhead = document.getElementById("overheadCost");
  var margin = document.getElementById("profitMargin");

  var outDistanceCost = document.getElementById("outDistanceCost");
  var outBase = document.getElementById("outBase");
  var outPer = document.getElementById("outPerDelivery");
  var outFinal = document.getElementById("outFinalFee");
  var outVehicle = document.getElementById("outVehicleNote");

  function num(el) {
    return Math.max(0, parseFloat(el.value) || 0);
  }

  function recalc() {
    var d = num(distance);
    var cpk = num(costPerKm);
    var f = num(fuel);
    var l = num(labor);
    var oh = num(overhead);
    var n = Math.max(1, parseInt(numDel.value, 10) || 1);
    var m = num(margin);

    var distCost = d * cpk;
    var base = distCost + f + l + oh;
    var per = base / n;
    var finalFee = m >= 100 ? per : per / (1 - m / 100);

    outDistanceCost.textContent = distCost.toFixed(2);
    outBase.textContent = base.toFixed(2);
    outPer.textContent = per.toFixed(2);
    outFinal.textContent = isFinite(finalFee) ? finalFee.toFixed(2) : "—";
    outVehicle.textContent = vehicle.value || "—";
  }

  [distance, costPerKm, fuel, labor, vehicle, numDel, overhead, margin].forEach(function (el) {
    el.addEventListener("input", recalc);
    el.addEventListener("change", recalc);
  });
  recalc();
})();
