define(function () {
    function Vehicle() {
        this.name = null;
        this.price = null;
        this.health = null;
        this.maxSpeed = null;
        this.driver = null;
        this.passengers = [];
    }
    return Vehicle;
});