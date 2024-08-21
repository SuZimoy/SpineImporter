var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/*
 * Created by Yuxin on 2015/8/11.
 * 更新2016/5/25. * 添加mesh，骨骼权重解析
 * 更新2016/8/31. * 补全由Spine三条时间轴引起的DB单轴的数据差错
 */
var main = (function (_super) {
    __extends(main, _super);
    function main() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.boneList = [];
        _this.weightedMesh = {};
        _this.armatureSlot = [];
        _this.displayIndexObject = {};
        _this.SPINE_FRAME = 30;
        _this.boneMatrix = [];
        return _this;
    }
    main.prototype.dataFileExtension = function () {
        return ["Json"];
    };
    main.prototype.dataFileDescription = function () {
        return "Spine data";
    };
    main.prototype.textureAtlasDataFileExtension = function () {
        return ["atlas", "texture"];
    };
    main.prototype.isSupportTextureAtlas = function () {
        return true;
    };
    main.prototype.convertToDBTextureAtlasData = function (data) {
        var dbTexture = {};
        try {
            var arr = data.split("\n");
            for (var i = 0; i < arr.length; i++) {
                if (arr[i] == "" || arr[i] == "\r") {
                    arr.splice(i, 1);
                }
            }
            for (var k = 0; k < arr.length; k++) {
                arr[k] = arr[k].replace("\r", "");
            }
            dbTexture["imagePath"] = arr[0];
            dbTexture["SubTexture"] = [];
            var imageArr = arr.slice(5);
            for (var j = 0; j < imageArr.length;) {
                var image = {};
                image["name"] = imageArr[j];
                var rota = imageArr[j + 1];
                rota = rota.slice(10);
                if (rota == "true") {
                    image["rotated"] = rota;
                }
                var xy = imageArr[j + 2];
                xy = xy.slice(5);
                var aa = xy.split(",");
                image["x"] = aa[0];
                image["y"] = aa[1];
                var size = imageArr[j + 3];
                size = size.slice(7);
                aa = size.split(",");
                image["width"] = aa[0];
                image["height"] = aa[1];
                /*var orig = imageArr[j+4];
                orig = orig.slice(7);
                aa = orig.split(",");
                image["frameWidth"] = Number(aa[0]);
                image["frameHeight"] = Number(aa[1]);
                var offset= imageArr[j+5];
                offset = offset.slice(9);
                aa = offset.split(",");
                image["frameX"] = Number(aa[0]);
                image["frameY"] = Number(aa[1]);*/
                j += 7;
                dbTexture["SubTexture"].push(image);
            }
        }
        catch (e) {  
        }
        return JSON.stringify(dbTexture);
    };
    main.prototype.checkDataValid = function (spineJson) {
        var data = JSON.parse(spineJson);
        if (data["skeleton"] && data["skeleton"]["spine"]) {
            return true;
        }
        return false;
    };
    main.prototype.convertToDBData = function (spineJson) {
        var DBJson = {};
        try {
            var data = JSON.parse(spineJson);
            DBJson["name"] = "dataName";
            DBJson["version"] = "4.5";
            DBJson["frameRate"] = 30;
            DBJson["isGlobal"] = 0;
            DBJson["armature"] = [];
            for (var i = 0; i < 1; i++) {
                var armature = {};
                armature["name"] = "armatureName";
                if (data.hasOwnProperty("bones")) {
                    armature["bone"] = [];
                    this.boneArmature(armature["bone"], data["bones"]);
                    this.createBoneList(armature["bone"]);
                }
                if (data.hasOwnProperty("skins")) {
                    armature["skin"] = [];
                    this.skinss(armature["skin"], data["skins"]);
                }
                if (data.hasOwnProperty("ik")) {
                    armature["ik"] = [];
                    this.ikArmature(armature["ik"], data["ik"]);
                }
                if (data.hasOwnProperty("slots")) {
                    armature["slot"] = [];
                    this.armatureSlot = [];
                    this.armatureSlot = armature["slot"];
                    this.slotArmature(armature["slot"], data["slots"]);
                }
                if (data.hasOwnProperty("animations")) {
                    armature["animation"] = [];
                    this.animation(armature["animation"], data["animations"], data["bones"]);
                }
                DBJson["armature"].push(armature);
            }
        }
        catch (e) {
        }
        return JSON.stringify(DBJson);
    };
    main.prototype.skinss = function (skin, data) {
        if(!Array.isArray(data)){
            var _skin = {};
            _skin["name"] = "";
            _skin["slot"] = [];
            for (var obj in data) {
                this.slotSkin(_skin["slot"], data[obj]);
            }
            skin.push(_skin);
        }
        else{
            for (var i = 0; i < data.length; i++) {
                var skinData = data[i];
                var _skin = {}; 
                _skin["name"] = skinData["name"];  // 取出name属性
                _skin["slot"] = [];
                if (skinData["attachments"]) {
                    this.slotSkin(_skin["slot"], skinData["attachments"]);  // 处理attachments中的数据
                }
                skin.push(_skin);
            }
        }
        
    };
    main.prototype.slotSkin = function (slot, data) {
        var oo;
        var flag = false;
        for (var objs in data) {
            for (oo in slot) {
                if (oo["name"] == objs) {
                    flag = true;
                    continue;
                }
            }
            if (flag)
                continue;
            var _slot = {};
            _slot["name"] = objs;
            _slot["display"] = [];
            this.displaySlotSkin(_slot["display"], data[objs], objs);
            slot.push(_slot);
        }
    };
    main.prototype.displaySlotSkin = function (display, data, objs) {
        var i = -1;
        for (var objss in data) {
            i++;
            this.displayIndexObject[objss] = i;
            var _display = {};
            if (data[objss]["name"])
                _display["name"] = data[objss]["name"];
            else
                _display["name"] = objss;
            //新加mesh类型
            /* if (data[objss]["type"])
                 _display["type"] = data[objss]["type"];
             else
                 _display["type"] = "image";*/
            var j = 1;
            if (data[objss]["type"] && data[objss]["type"] == "mesh") {
                _display["type"] = "mesh";
                if (data[objss]["vertices"]) {
                    if (data[objss]["uvs"] && (data[objss]["uvs"].length == data[objss]["vertices"].length)) {
                        _display["vertices"] = data[objss]["vertices"];
                        for (j = 1; j < _display["vertices"].length; j = j + 2) {
                            _display["vertices"][j] = -_display["vertices"][j];
                        }
                    }
                    else {
                        this.createWeightedMeshData(_display, data[objss]["vertices"]);
                        this.weightedMesh[_display["name"]] = _display;
                    }
                }
            }
            else if (data[objss]["type"] && (data[objss]["type"] == "weightedmesh" || data[objss]["type"] == "skinnedmesh")) {
                _display["type"] = "mesh";
                if (data[objss]["vertices"]) {
                    this.createWeightedMeshData(_display, data[objss]["vertices"]);
                    this.weightedMesh[_display["name"]] = _display;
                }
            }
            else {
                _display["type"] = "image";
                if (data[objss]["vertices"]) {
                    _display["vertices"] = data[objss]["vertices"];
                    for (j = 1; j < _display["vertices"].length; j = j + 2) {
                        _display["vertices"][j] = -_display["vertices"][j];
                    }
                }
            }
            if (data[objss]["uvs"])
                _display["uvs"] = data[objss]["uvs"];
            if (data[objss]["triangles"])
                _display["triangles"] = data[objss]["triangles"];
            /*if (data[objss]["vertices"]) {
                _display["vertices"] = data[objss]["vertices"];
                for (j = 1; j < _display["vertices"].length; j++) {
                    _display["vertices"][j] = -_display["vertices"][j];
                    j++;
                }
            }*/
            if (data[objss]["width"])
                _display["width"] = data[objss]["width"];
            if (data[objss]["height"])
                _display["height"] = data[objss]["height"];
            if (data[objss]["edges"]) {
                for (var numa = 0; numa < data[objss]["edges"].length; numa++) {
                    data[objss]["edges"][numa] = (data[objss]["edges"][numa] / 2);
                }
                _display["edges"] = [];
                var edgesNum = data[objss]["edges"].length;
                if (data[objss]["hull"]) {
                    var ttArray = this.spliceOutlineAndUserEdge(data[objss]["hull"] * 2, data[objss]["edges"], data[objss]["uvs"], data[objss]["width"], data[objss]["height"]);
                    if (ttArray.length == 2) {
                        _display["edges"] = ttArray[0];
                        _display["userEdges"] = ttArray[1];
                    }
                    else {
                        for (var num = 0; num < edgesNum; num++) {
                            _display["edges"].push(data[objss]["edges"][num]);
                        }
                    }
                }
                else {
                    for (var num = 0; num < edgesNum; num++) {
                        _display["edges"].push(data[objss]["edges"][num]);
                    }
                }
            }
            //新加mesh类型
            if (data[objss].hasOwnProperty("scaleX")) {
                if (!_display["transform"]) {
                    _display["transform"] = {};
                }
                _display["transform"]["scX"] = data[objss]["scaleX"];
            }
            if (data[objss].hasOwnProperty("scaleY")) {
                if (!_display["transform"]) {
                    _display["transform"] = {};
                }
                _display["transform"]["scY"] = data[objss]["scaleY"];
            }
            if (data[objss].hasOwnProperty("x")) {
                if (!_display["transform"]) {
                    _display["transform"] = {};
                }
                _display["transform"]["x"] = data[objss]["x"];
            }
            if (data[objss].hasOwnProperty("y")) {
                if (!_display["transform"]) {
                    _display["transform"] = {};
                }
                _display["transform"]["y"] = -data[objss]["y"];
            }
            if (data[objss].hasOwnProperty("rotation")) {
                if (!_display["transform"]) {
                    _display["transform"] = {};
                }
                _display["transform"]["skX"] = -data[objss]["rotation"];
                _display["transform"]["skY"] = -data[objss]["rotation"];
            }
            display.push(_display);
        }
    };
    main.prototype.boneArmature = function (bone, data) {
        for (var obj in data) {
            var _bone = {};
            if (data[obj].hasOwnProperty("name"))
                _bone["name"] = data[obj]["name"];
            if (data[obj].hasOwnProperty("parent"))
                _bone["parent"] = data[obj]["parent"];
            if (data[obj].hasOwnProperty("length"))
                _bone["length"] = data[obj]["length"];
            if (data[obj].hasOwnProperty("inheritRotation"))
                _bone["inheritRotation"] = (data[obj]["inheritRotation"] == false ? 0 : 1);
            if (data[obj].hasOwnProperty("inheritScale"))
                _bone["inheritScale"] = (data[obj]["inheritScale"] == false ? 0 : 1);
            if (data[obj].hasOwnProperty("color"))
                _bone["color"] = data[obj]["color"];
            if (data[obj].hasOwnProperty("x")) {
                if (!_bone["transform"]) {
                    _bone["transform"] = {};
                }
                _bone["transform"]["x"] = data[obj]["x"];
            }
            if (data[obj].hasOwnProperty("y")) {
                if (!_bone["transform"]) {
                    _bone["transform"] = {};
                }
                _bone["transform"]["y"] = -data[obj]["y"];
            }
            if (data[obj].hasOwnProperty("rotation")) {
                if (!_bone["transform"]) {
                    _bone["transform"] = {};
                }
                _bone["transform"]["skX"] = -data[obj]["rotation"];
                _bone["transform"]["skY"] = -data[obj]["rotation"];
            }
            if (data[obj].hasOwnProperty("scaleX")) {
                if (!_bone["transform"]) {
                    _bone["transform"] = {};
                }
                _bone["transform"]["scX"] = data[obj]["scaleX"];
            }
            if (data[obj].hasOwnProperty("scaleY")) {
                if (!_bone["transform"]) {
                    _bone["transform"] = {};
                }
                _bone["transform"]["scY"] = data[obj]["scaleY"];
            }
            bone.push(_bone);
        }
    };
    main.prototype.ikArmature = function (ik, data) {
        for (var obj in data) {
            var _ik = {};
            if (data[obj].hasOwnProperty("name"))
                _ik["name"] = data[obj]["name"];
            if (data[obj].hasOwnProperty("target"))
                _ik["target"] = data[obj]["target"];
            if (data[obj].hasOwnProperty("bendPositive") && (data[obj]["bendPositive"] == false)) {
                _ik["bendPositive"] = true;
            }
            else {
                _ik["bendPositive"] = false;
            }
            if (data[obj].hasOwnProperty("mix"))
                _ik["weight"] = data[obj]["mix"];
            if (data[obj].hasOwnProperty("bones")) {
                if (data[obj]["bones"].length > 1) {
                    _ik["bone"] = data[obj]["bones"][1];
                    _ik["chain"] = 1;
                }
                else {
                    _ik["bone"] = data[obj]["bones"][0];
                    _ik["chain"] = 0;
                }
            }
            ik.push(_ik);
        }
    };
    main.prototype.slotArmature = function (slot, data) {
        for (var obj in data) {
            var _solt = {};
            if (data[obj].hasOwnProperty("name"))
                _solt["name"] = data[obj]["name"];
            if (data[obj].hasOwnProperty("bone"))
                _solt["parent"] = data[obj]["bone"];
            if (data[obj].hasOwnProperty("attachment")) {
                if (this.displayIndexObject[data[obj]["attachment"]] != 0)
                    _solt["displayIndex"] = this.displayIndexObject[data[obj]["attachment"]];
            }
            else {
                _solt["displayIndex"] = -1;
            }

            switch (data[obj].blend) {
                case "additive":
                    _solt["blendMode"] = "add";
                    break;
            }

            var color = data[obj].color;
            if (color && color.length == 8) {
                _solt.color = {};
                _solt.color.rM = Math.round(Number("0x" + color[0] + color[1]) / 255 * 100);
                _solt.color.gM = Math.round(Number("0x" + color[2] + color[3]) / 255 * 100);
                _solt.color.bM = Math.round(Number("0x" + color[4] + color[5]) / 255 * 100);
                _solt.color.aM = Math.round(Number("0x" + color[6] + color[7]) / 255 * 100);
            }

            slot.push(_solt);
        }
    };
    //动画部分 ----------------------------
    main.prototype.animation = function (animation, data, bones) {
        for (var obj in data) {
            var _animation = {};
            _animation["name"] = obj;
            //解析Zorder
            if (data[obj].hasOwnProperty("draworder")) {
                _animation["zOrder"] = {};
                _animation["zOrder"]["frame"] = [];
                var isFirstzorder = false;
                for (var objdo in data[obj]["draworder"]) {
                    var _zOrder = {};
                    if (data[obj]["draworder"][objdo]["time"] == 0) {
                        isFirstzorder = true;
                    }
                    this.zOrderAnimation(_zOrder, data[obj]["draworder"][objdo]);
                    _animation["zOrder"]["frame"].push(_zOrder);
                }
                if (!isFirstzorder) {
                    var zo = {};
                    zo["duration"] = 0;
                    zo["tweenEasing"] = null;
                    zo["zOrder"] = [];
                    _animation["zOrder"]["frame"].push(zo);
                }
                _animation["zOrder"]["frame"].sort(this.Compare);
                this.repairDuration(_animation["zOrder"]["frame"]);
            }
            //解析Zorder完毕
            var boneTimelines = [];
            if (data[obj].hasOwnProperty("bones")) {
                _animation["bone"] = [];
                for (var objb in data[obj]["bones"]) {
                    var _bone = {};
                    _bone["name"] = objb;
                    this.boneAnimation(_bone, data[obj]["bones"][objb]);
                    _animation["bone"].push(_bone);
                    boneTimelines.push(_bone["name"]);
                }
            }
            //mesh
            if (data[obj].hasOwnProperty("ffd")) {
                _animation["ffd"] = [];
                for (var objf in data[obj]["ffd"]) {
                    //_ffd.name = objf;
                    this.ffdAnimation(_animation["ffd"], data[obj]["ffd"][objf]);
                }
            }
            //3.*.*版本以上用 deform 替代了 ffd
            if (data[obj].hasOwnProperty("deform")) {
                _animation["ffd"] = [];
                for (var objDeform in data[obj]["deform"]) {
                    this.ffdAnimation(_animation["ffd"], data[obj]["deform"][objDeform]);
                }
            }
            //3.*.*版本以上用 deform 替代了 ffd
            //mesh
            if (data[obj].hasOwnProperty("slots")) {
                _animation["slot"] = [];
                for (var objs in data[obj]["slots"]) {
                    var _slot = {};
                    _slot["name"] = objs;
                    this.slotAnimation(_slot, data[obj]["slots"][objs]);
                    _animation["slot"].push(_slot);
                }
            }
            if (data[obj].hasOwnProperty("events")) {
                _animation["frame"] = [];
                var isFirstEvent = false;
                for (var evt in data[obj]["events"]) {
                    var events = {};
                    this.eventAnimation(events, data[obj]["events"][evt]);
                    _animation["frame"].push(events);
                    if (data[obj]["events"][evt]["time"] == 0)
                        isFirstEvent = true;
                }
                if (!isFirstEvent) {
                    var e = {};
                    e["duration"] = 0;
                    _animation["frame"].push(e);
                }
                _animation["frame"].sort(this.Compare);
                this.repairDuration(_animation["frame"]);
            }
            animation.push(_animation);
        }
    };
    main.prototype.zOrderAnimation = function (_zOrder, data) {
        _zOrder["tweenEasing"] = null;
        _zOrder["zOrder"] = [];
        if (data.hasOwnProperty("time")) {
            _zOrder["duration"] = Math.round(Number(data["time"]) * this.SPINE_FRAME);
        }
        if (data.hasOwnProperty("offsets")) {
            for (var obj in data["offsets"]) {
                _zOrder["zOrder"].push(this.getZOrderBySlotName(data["offsets"][obj]["slot"]));
                _zOrder["zOrder"].push(data["offsets"][obj]["offset"]);
            }
        }
    };
    main.prototype.getZOrderBySlotName = function (slotName) {
        for (var i = 0; i < this.armatureSlot.length; i++) {
            if (this.armatureSlot[i]["name"] == slotName) {
                return i;
            }
        }
        return 0;
    };
    main.prototype.boneAnimation = function (_bone, data) {
        _bone["frame"] = [];
        var _frame = {};
        var hasFirstFrame = false;
        if (data.hasOwnProperty("rotate")) {
            for (var obj in data["rotate"]) {
                _frame = {};
                _bone["frame"].push(_frame);
                if (data["rotate"][obj].hasOwnProperty("time")) {
                    _frame["duration"] = Math.round(Number(data["rotate"][obj]["time"]) * this.SPINE_FRAME);
                }
                if (data["rotate"][obj].hasOwnProperty("angle")) {
                    if (!_frame["transform"])
                        _frame["transform"] = {};
                    _frame["transform"]["skX"] = -data["rotate"][obj]["angle"];
                    _frame["transform"]["skY"] = -data["rotate"][obj]["angle"];
                }
                this.addCurveToDB(_frame, data["rotate"][obj]);
                if (_frame["duration"] == 0) {
                    hasFirstFrame = true;
                }
            }
            if (!hasFirstFrame) {
                hasFirstFrame = true;
                _frame = {};
                _frame["duration"] = 0;
                this.addCurveToDB(_frame, {});
                _bone["frame"].push(_frame);
            }
        }
        var flag = -1;
        if (data.hasOwnProperty("translate")) {
            for (var objl in data["translate"]) {
                if (data["translate"][objl].hasOwnProperty("time"))
                    flag = this.getFrameForTime(_bone, Math.round(Number(data["translate"][objl]["time"]) * this.SPINE_FRAME));
                if (flag < 0) {
                    _frame = {};
                    _bone["frame"].push(_frame);
                    if (data["translate"][objl].hasOwnProperty("time")) {
                        _frame["duration"] = Math.round(Number(data["translate"][objl]["time"]) * this.SPINE_FRAME);
                    }
                }
                else {
                    _frame = _bone["frame"][flag];
                }
                if (data["translate"][objl].hasOwnProperty("x")) {
                    if (!_frame["transform"])
                        _frame["transform"] = {};
                    _frame["transform"]["x"] = data["translate"][objl]["x"];
                }
                if (data["translate"][objl].hasOwnProperty("y")) {
                    if (!_frame["transform"])
                        _frame["transform"] = {};
                    _frame["transform"]["y"] = -data["translate"][objl]["y"];
                }
                this.addCurveToDB(_frame, data["translate"][objl]);
                if (_frame["duration"] == 0) {
                    hasFirstFrame = true;
                }
            }
            if (!hasFirstFrame) {
                hasFirstFrame = true;
                _frame = {};
                _frame["duration"] = 0;
                this.addCurveToDB(_frame, {});
                _bone["frame"].push(_frame);
            }
        }
        flag = -1;
        if (data.hasOwnProperty("scale")) {
            for (var objy in data["scale"]) {
                if (data["scale"][objy].hasOwnProperty("time"))
                    flag = this.getFrameForTime(_bone, Math.round(Number(data["scale"][objy]["time"]) * this.SPINE_FRAME));
                if (flag < 0) {
                    _frame = {};
                    _bone["frame"].push(_frame);
                    if (data["scale"][objy].hasOwnProperty("time")) {
                        _frame["duration"] = Math.round(Number(data["scale"][objy]["time"]) * this.SPINE_FRAME);
                    }
                }
                else {
                    _frame = _bone["frame"][flag];
                }
                if (data["scale"][objy].hasOwnProperty("x")) {
                    if (!_frame["transform"])
                        _frame["transform"] = {};
                    _frame["transform"]["scX"] = data["scale"][objy]["x"];
                }
                if (data["scale"][objy].hasOwnProperty("y")) {
                    if (!_frame["transform"])
                        _frame["transform"] = {};
                    _frame["transform"]["scY"] = data["scale"][objy]["y"];
                }
                this.addCurveToDB(_frame, data["scale"][objy]);
                if (_frame["duration"] == 0) {
                    hasFirstFrame = true;
                }
            }
            if (!hasFirstFrame) {
                hasFirstFrame = true;
                _frame = {};
                _frame["duration"] = 0;
                this.addCurveToDB(_frame, {});
                _bone["frame"].push(_frame);
            }
        }
        if (_bone["frame"].length > 0) {
            _bone["frame"].sort(this.Compare);
            this.repairDuration(_bone["frame"]);
        }
    };
    main.prototype.ffdAnimation = function (ffd, data) {
        for (var fd in data) {
            for (var fdname in data[fd]) {
                var _ffd = {};
                _ffd["slot"] = fd;
                _ffd["skin"] = "";
                _ffd["scale"] = 1;
                _ffd["offset"] = 0;
                _ffd["frame"] = [];
                _ffd["name"] = fdname;
                this.fddFrameAnimation(_ffd["frame"], data[fd][fdname], this.getWeightedMesh(fdname));
                _ffd["frame"].sort(this.Compare);
                this.repairDuration(_ffd["frame"]);
                ffd.push(_ffd);
            }
        }
    };
    main.prototype.getWeightedMesh = function (name) {
        if (this.weightedMesh.hasOwnProperty(name)) {
            return this.weightedMesh[name];
        }
        return {};
    };
    main.prototype.fddFrameAnimation = function (fddFrame, data, weightMeshObj) {
        var bbw = []; //{0,[{1,0.6},{2,0.4}]}
        if (weightMeshObj.hasOwnProperty("bonePose")) {
            var nn = 0;
            var bn = 0;
            while (weightMeshObj["weights"] && weightMeshObj["weights"][nn]) {
                bn = weightMeshObj["weights"][nn];
                var boneL = [];
                for (var k = nn + 1; k < nn + 1 + (2 * bn); k++) {
                    var bb = {};
                    bb["id"] = weightMeshObj["weights"][k];
                    bb["we"] = weightMeshObj["weights"][k + 1];
                    boneL.push(bb);
                    k++;
                }
                bbw.push(boneL);
                nn += 1 + (2 * bn);
            }
        }
        var hasFirstFrame = false;
        for (var k = 0, len = data.length; k < len; k++) {
            var ffdFrame = {};
            var temp = 0;
            if (data[k].hasOwnProperty("time")) {
                ffdFrame["duration"] = Math.round(Number(data[k]["time"]) * this.SPINE_FRAME);
            }
            if (data[k].hasOwnProperty("vertices")) {
                ffdFrame["vertices"] = [];
                if (bbw.length > 0) {
                    this.transFfdFrameWeigthMesh(ffdFrame, data[k], bbw);
                }
                else {
                    if (data[k].hasOwnProperty("offset")) {
                        ffdFrame["offset"] = data[k]["offset"];
                        temp = ffdFrame["offset"];
                    }
                    ffdFrame["vertices"] = data[k]["vertices"];
                    for (var i = 0; i < ffdFrame["vertices"].length; i++) {
                        if (temp % 2 == 1) {
                            ffdFrame["vertices"][i] = -ffdFrame["vertices"][i];
                            i++;
                        }
                        else {
                            i++;
                            ffdFrame["vertices"][i] = -ffdFrame["vertices"][i];
                        }
                    }
                }
            }
            this.addCurveToDB(ffdFrame, data[k]);
            if (ffdFrame["duration"] == 0) {
                hasFirstFrame = true;
            }
            fddFrame.push(ffdFrame);
        }
        if (!hasFirstFrame) {
            hasFirstFrame = true;
            var _frame = {};
            _frame["duration"] = 0;
            fddFrame.push(_frame);
        }
    };
    main.prototype.transFfdFrameWeigthMesh = function (ffdFrame, frame, ffdWeightList) {
        var bnum = ffdWeightList.length;
        ffdFrame["vertices"] = [];
        var offset = 0;
        if (frame.hasOwnProperty("offset")) {
            for (var l = 0; l < frame["offset"]; l++) {
                frame["vertices"].unshift(0);
            }
        }
        ffdFrame["offset"] = 0; //offset
        var ffdWeight = [];
        for (var j = 0; j < bnum; j++) {
            ffdWeight.push(frame["vertices"].splice(0, ffdWeightList[j].length * 2));
        }
        for (var i = 0; i < ffdWeight.length; i++) {
            var po = this.getVerticesMoreBone(ffdWeight[i], ffdWeightList[i]);
            ffdFrame["vertices"].push(po.x); //x坐标
            ffdFrame["vertices"].push(po.y); //坐标
        }
    };
    main.prototype.getVerticesMoreBone = function (ffdWeight, ffdWeightList) {
        var point = new Point();
        var p = new Point();
        for (var i = 0; i < ffdWeight.length; i = i + 2) {
            var temp = this.getBoneMatrix(ffdWeightList[i / 2]["id"]);
            var bmatrix = new Matrix();
            bmatrix.a = temp.a;
            bmatrix.b = temp.b;
            bmatrix.c = temp.c;
            bmatrix.d = temp.d;
            bmatrix.tx = bmatrix.ty = 0;
            p.x = ffdWeight[i];
            p.y = -ffdWeight[i + 1];
            p = this.transformPoint(bmatrix, p.x, p.y);
            if (ffdWeight[i] != 0)
                point.x += ffdWeightList[i / 2]["we"] * p.x;
            if (ffdWeight[i + 1] != 0)
                point.y += ffdWeightList[i / 2]["we"] * p.y;
        }
        return point;
    };
    main.prototype.slotAnimation = function (_slot, data) {
        var _frame = {};
        var hasFirstFrame = false;
        if (data.hasOwnProperty("attachment")) {
            _slot["frame"] = [];
            for (var obj in data["attachment"]) {
                _frame = {};
                if (data["attachment"][obj].hasOwnProperty("time")) {
                    _frame["duration"] = Math.round(Number(data["attachment"][obj]["time"]) * this.SPINE_FRAME);
                }
                if (data["attachment"][obj].hasOwnProperty("name")) {
                    if (data["attachment"][obj]["name"])
                        _frame["displayIndex"] = this.displayIndexObject[data["attachment"][obj]["name"]];
                    else
                        _frame["displayIndex"] = -1;
                }
                this.addCurveToDB(_frame, data["attachment"][obj]);
                _slot["frame"].push(_frame);
                if (_frame["duration"] == 0) {
                    hasFirstFrame = true;
                }
            }
            var flagC = -1;
            if (!hasFirstFrame) {
                hasFirstFrame = true;
                flagC = this.getFrameForTime(_slot, 0);
                if (flagC < 0) {
                    _frame = {};
                    _slot["frame"].push(_frame);
                    _frame["duration"] = 0;
                    this.addCurveToDB(_frame, {});
                }
                else {
                    _frame = _slot["frame"][flagC];
                }
                //检测slot中slot.name的displayIndex
                for (var oo = 0; oo < this.armatureSlot.length; oo++) {
                    if (this.armatureSlot[oo]["name"] == _slot["name"]) {
                        if (this.armatureSlot[oo].hasOwnProperty("displayIndex")) { 
                            _frame["displayIndex"] = this.armatureSlot[oo]["displayIndex"]; //如果运动中spine的第一帧取slotArnature默认值。
                        }

                        if (this.armatureSlot[oo].hasOwnProperty("color")) { 
                            _frame["color"] = this.armatureSlot[oo]["color"]; //如果运动中spine的第一帧取slotArnature默认值。
                        }
                    }
                }
            }
        }
        var flag = -1;
        if (data.hasOwnProperty("color")) {
            if (!_slot["frame"])
                _slot["frame"] = [];
            for (var objs in data["color"]) {
                if (data["color"][objs].hasOwnProperty("time"))
                    flag = this.getFrameForTime(_slot, Math.round(Number(data["color"][objs]["time"]) * this.SPINE_FRAME));
                if (flag < 0) {
                    _frame = {};
                    _slot["frame"].push(_frame);
                    if (data["color"][objs].hasOwnProperty("time")) {
                        _frame["duration"] = Math.round(Number(data["color"][objs]["time"]) * this.SPINE_FRAME);
                    }
                    //给_slot["frame"]做一次排序
                    _slot["frame"].sort(this.Compare);
                    //得到上一个关键帧
                    var perFrame = {};
                    for (var k = 0; k < _slot["frame"].length; k++) {
                        if (_frame["duration"] > _slot["frame"][k]["duration"]) {
                            perFrame = _slot["frame"][k];
                        }
                    }
                    //设置此帧的displayIndex
                    if (perFrame["duration"] == 0 && !perFrame.hasOwnProperty("displayIndex")) {
                        for (var kk = 0; kk < this.armatureSlot.length; kk++) {
                            if (this.armatureSlot[kk]["name"] == _slot["name"]) {
                                if (this.armatureSlot[kk].hasOwnProperty("displayIndex"))
                                    perFrame["displayIndex"] = this.armatureSlot[kk]["displayIndex"]; //如果运动中spine的第一帧取slotArnature默认值。
                            }
                        }
                    }
                    if (perFrame.hasOwnProperty("displayIndex"))
                        _frame["displayIndex"] = perFrame["displayIndex"];
                }
                else {
                    _frame = _slot["frame"][flag];
                }
                this.addCurveToDB(_frame, data["color"][objs]);
                if (_frame["duration"] == 0) {
                    hasFirstFrame = true;
                }
                if (data["color"][objs].hasOwnProperty("color")) {
                    if (!_frame["color"])
                        _frame["color"] = {};
                    _frame["color"] = this.changeColorToDB(data["color"][objs]["color"]);
                }
            }
            var flagCD = -1;
            if (!hasFirstFrame) {
                hasFirstFrame = true;
                flagCD = this.getFrameForTime(_slot, 0);
                if (flagCD < 0) {
                    _frame = {};
                    _slot["frame"].push(_frame);
                    _frame["duration"] = 0;
                    this.addCurveToDB(_frame, {});
                }
                else {
                    _frame = _slot["frame"][flagCD];
                }
                //检测slot中slot.name的displayIndex
                for (var ood = 0; ood < this.armatureSlot.length; ood++) {
                    if (this.armatureSlot[ood]["name"] == _slot["name"]) {
                        if (this.armatureSlot[ood].hasOwnProperty("displayIndex")) { 
                            _frame["displayIndex"] = this.armatureSlot[ood]["displayIndex"]; //如果运动中spine的第一帧取slotArnature默认值。
                        }
                    }
                }
            }
        }
        if (_slot["frame"].length > 0) {
            _slot["frame"].sort(this.Compare);
            this.repairDuration(_slot["frame"]);
        }
    };
    main.prototype.eventAnimation = function (_event, data) {
        if (data.hasOwnProperty("name"))
            _event["event"] = data["name"];
        if (data.hasOwnProperty("time")) {
            _event["duration"] = Math.round(Number(data["time"]) * this.SPINE_FRAME);
        }
    };
    main.prototype.changeColorToDB = function (colorString) {
        var _color = {};
        var arr = [];
        for (var i = 0; i < colorString.length; i++) {
            if (i % 2 == 0)
                arr.push(parseInt(colorString.substr(i, 2), 16));
        }
        _color["rM"] = (arr[0] / 255) * 100;
        _color["gM"] = (arr[1] / 255) * 100;
        _color["bM"] = (arr[2] / 255) * 100;
        _color["aM"] = (arr[3] / 255) * 100;
        return _color;
    };
    /**将从小到大的递增数设置为逐级差值**/
    main.prototype.repairDuration = function (frame) {
        for (var i = 0; i < frame.length - 1; i++) {
            frame[i]["duration"] = frame[i + 1]["duration"] - frame[i]["duration"];
        }
        frame[frame.length - 1]["duration"] = 0;
        //补全由Spine三条时间轴引起的DB单轴的数据差错。（并为完全意义上的修复，只是稍微减少一下差错）
        var tempX = 0;
        var tempY = 0;
        var tempskX = 0;
        var tempskY = 0;
        var tempscX = 1;
        var tempscY = 1;
        var tempFrame = {};
        for (var j = 0; j < frame.length; j++) {
            tempFrame = frame[j];
            if (tempFrame.hasOwnProperty("transform")) {
                if (tempFrame["transform"].hasOwnProperty("x")) {
                    tempX = tempFrame["transform"]["x"];
                }
                else {
                    tempFrame["transform"]["x"] = tempX;
                }
                if (tempFrame["transform"].hasOwnProperty("y")) {
                    tempY = tempFrame["transform"]["y"];
                }
                else {
                    tempFrame["transform"]["y"] = tempY;
                }
                if (tempFrame["transform"].hasOwnProperty("skX")) {
                    tempskX = tempFrame["transform"]["skX"];
                }
                else {
                    tempFrame["transform"]["skX"] = tempskX;
                }
                if (tempFrame["transform"].hasOwnProperty("skY")) {
                    tempskY = tempFrame["transform"]["skY"];
                }
                else {
                    tempFrame["transform"]["skY"] = tempskY;
                }
                if (tempFrame["transform"].hasOwnProperty("scX")) {
                    tempscX = tempFrame["transform"]["scX"];
                }
                else {
                    tempFrame["transform"]["scX"] = tempscX;
                }
                if (tempFrame["transform"].hasOwnProperty("scY")) {
                    tempscY = tempFrame["transform"]["scY"];
                }
                else {
                    tempFrame["transform"]["scY"] = tempscY;
                }
            }
        }
    };
    /**排序，按时间顺序**/
    main.prototype.Compare = function (paraA, paraB) {
        var durationA = paraA["duration"];
        var durationB = paraB["duration"];
        if (durationA > durationB) {
            return 1;
        }
        else if (durationA < durationB) {
            return -1;
        }
        else {
            return 0;
        }
    };
    /**获取同时间点的Frame**/
    main.prototype.getFrameForTime = function (_bone, times) {
        var flag = -1;
        for (var i = 0; i < _bone["frame"].length; i++) {
            if (_bone["frame"][i]["duration"] == times)
                flag = i;
        }
        return flag;
    };
    main.prototype.addCurveToDB = function (_frame, obj) {
        if (obj.hasOwnProperty("curve")) {
            var curve =[];
            if  (obj.hasOwnProperty("c2")){
                curve.push(obj["curve"]);
                curve.push(obj["c2"]);
                curve.push(obj["c3"]);
                if(obj.hasOwnProperty("c4")){
                    curve.push(obj["c4"]);
                }
                else{
                    curve.push(1);
                }
            }
            if (obj["curve"] == "stepped") {
                if (!_frame["tweenEasing"]) {
                    _frame["tweenEasing"] = "NaN";
                }
            }
            else {
                this.addCurveToFrame(_frame, curve);
            }
        }
        else {
            //spine没有值，就是直线
            this.addCurveToFrame(_frame, [0, 0, 1, 1]);
            if (!_frame["tweenEasing"]) {
                _frame["tweenEasing"] = 0;
            }
        }
    };
    main.prototype.addCurveToFrame = function (_frame, _curve) {
        if (_frame["curve"]) {
            _frame["curve"] = this.getTwoCurveAverage(_frame["curve"], _curve);
        }
        else {
            _frame["curve"] = _curve;
        }
    };
    main.prototype.getTwoCurveAverage = function (curve1, curve2) {
        var _curve = [];
        for (var i = 0; i < 4; i++) {
            _curve[i] = (curve1[i] + curve2[i]) / 2;
        }
        return _curve;
    };
    /**
     * 分开边线和内部线
     * @param    points
     * @param    hull
     * @param    edges
     * @return
     */
    main.prototype.spliceOutlineAndUserEdge = function (hull, edges, uv, width, height) {
        var leftIndex = -1;
        var rightIndex = -1;
        var topIndex = -1;
        var bottomIndex = -1;
        var i;
        var len;
        var leftMax = Number.MAX_VALUE;
        var rightMax = -Number.MAX_VALUE;
        var topMax = -Number.MAX_VALUE;
        var bottomMax = Number.MAX_VALUE;
        var allCircle = [];
        var outline = [];
        var points = [];
        var halfW = width / 2;
        var halfH = height / 2;
        var returnArr = [];
        for (i = 0, len = uv.length; i < len; i += 2) {
            points.push(width * uv[i] - halfW);
            points.push(height * uv[i + 1] - halfH);
        }
        //找到上下左右四个点的位置，这四个点肯定是边界上的点
        for (i = 0, len = points.length; i < len; i += 2) {
            if (points[i] < leftMax) {
                leftIndex = i / 2;
                leftMax = points[i];
            }
            if (points[i] > rightMax) {
                rightIndex = i / 2;
                rightMax = points[i];
            }
            if (points[i + 1] > topMax) {
                topIndex = i / 2;
                topMax = points[i + 1];
            }
            if (points[i + 1] < bottomMax) {
                bottomIndex = i / 2;
                bottomMax = points[i + 1];
            }
        }
        //找到最左边的点作为起点
        var p0 = leftIndex;
        var lastAngle;
        var p1Edge = this.getNextEdges(p0, p0, edges, points, 0);
        var p1 = -1;
        if (p1Edge[0] == p0) {
            p1 = p1Edge[1];
        }
        else {
            p1 = p1Edge[0];
        }
        lastAngle = p1Edge[2];
        lastAngle -= Math.PI;
        if (lastAngle < 0) {
            lastAngle += Math.PI * 2;
        }
        if (p0 >= 0 && p1 >= 0) {
            outline = [];
            outline.push(p0, p1);
            var hasFind;
            var nextEdge = this.getNextEdges(p0, p1, edges, points, lastAngle);
            while (nextEdge && nextEdge.length == 3) {
                outline.push(nextEdge[0], nextEdge[1]);
                if (nextEdge[1] == outline[0] && outline.length == hull) {
                    hasFind = true;
                    break;
                }
                else if (outline.length >= hull) {
                    break;
                }
                lastAngle = nextEdge[2];
                lastAngle -= Math.PI;
                if (lastAngle < 0) {
                    lastAngle += Math.PI * 2;
                }
                nextEdge = this.getNextEdges(nextEdge[0], nextEdge[1], edges, points, lastAngle);
            }
            if (hasFind) {
                for (i = 0, len = outline.length; i < len; i += 2) {
                    this.removePointFromEdges(edges, outline[i], outline[i + 1]);
                }
                returnArr[0] = outline;
                returnArr[1] = edges;
            }
        }
        return returnArr;
    };
    main.prototype.getNextEdges = function (p0, p1, allEdges, points, lastAngle) {
        var edges = this.getConnectEdges(p0, p1, allEdges);
        var point0 = new Point();
        var point1 = new Point();
        var p0Index;
        var p1Index;
        var maxAngle = 10000;
        var angle;
        var originAngle;
        var nextEdge = [];
        for (var i = 0, len = edges.length; i < len; i += 2) {
            p0Index = edges[i];
            p1Index = edges[i + 1];
            point0.x = points[p0Index * 2];
            point0.y = points[p0Index * 2 + 1];
            point1.x = points[p1Index * 2];
            point1.y = points[p1Index * 2 + 1];
            angle = this.getAngle(point0, point1);
            originAngle = angle;
            angle -= lastAngle;
            if (angle < 0) {
                angle += Math.PI * 2;
            }
            if (angle < maxAngle) {
                maxAngle = angle;
                nextEdge[0] = p0Index;
                nextEdge[1] = p1Index;
                nextEdge[2] = originAngle;
            }
        }
        return nextEdge;
    };
    main.prototype.getAngle = function (p0, p1) {
        var a = p1.x - p0.x;
        var b = p1.y - p0.y;
        var angle = Math.atan2(a, b);
        if (angle < 0) {
            angle += Math.PI * 2;
        }
        return angle;
    };
    main.prototype.getConnectEdges = function (p0, p1, edges) {
        var i;
        var len;
        var x;
        var y;
        var connectEdges = [];
        for (i = 0, len = edges.length / 2; i < len; i++) {
            x = edges[i * 2];
            y = edges[i * 2 + 1];
            if ((x == p0 && y == p1) || (x == p1 && y == p0)) {
                continue;
            }
            if (x == p1) {
                connectEdges.push(x, y);
            }
            else if (y == p1) {
                connectEdges.push(y, x);
            }
        }
        return connectEdges;
    };
    main.prototype.getEdgeIndex = function (edges, p0, p1) {
        var index = -1;
        for (var i = 0, len = edges.length; i < len; i += 2) {
            if ((edges[i] == p0 && edges[i + 1] == p1) ||
                (edges[i] == p1 && edges[i + 1] == p0)) {
                index = i;
                break;
            }
        }
        return index;
    };
    main.prototype.removePointFromEdges = function (edges, p0, p1) {
        var index = this.getEdgeIndex(edges, p0, p1);
        if (index >= 0) {
            edges.splice(index, 2);
        }
    };
    main.prototype.createBoneList = function (_boneList) {
        this.boneList = [];
        var i = 0;
        for (i = 0; i < _boneList.length; i++) {
            var bone = {};
            bone["name"] = _boneList[i]["name"];
            if (_boneList[i].hasOwnProperty("parent"))
                bone["pp"] = _boneList[i]["parent"];
            var trans = new DBTransform();
            trans.x = 0;
            trans.y = 0;
            trans.skewX = 0;
            trans.skewY = 0;
            trans.scaleX = 1;
            trans.scaleY = 1;
            if (_boneList[i].hasOwnProperty("transform")) {
                if (_boneList[i]["transform"].hasOwnProperty("skX")) {
                    trans.skewX = _boneList[i]["transform"]["skX"];
                }
                if (_boneList[i]["transform"].hasOwnProperty("skY")) {
                    trans.skewY = _boneList[i]["transform"]["skY"];
                }
                if (_boneList[i]["transform"].hasOwnProperty("x"))
                    trans.x = _boneList[i]["transform"]["x"];
                if (_boneList[i]["transform"].hasOwnProperty("y"))
                    trans.y = _boneList[i]["transform"]["y"];
                if (_boneList[i]["transform"].hasOwnProperty("scX"))
                    trans.scaleX = _boneList[i]["transform"]["scX"];
                if (_boneList[i]["transform"].hasOwnProperty("scY"))
                    trans.scaleY = _boneList[i]["transform"]["scY"];
            }
            bone["transform"] = trans;
            this.boneList.push(bone);
        }
        for (i = 0; i < this.boneList.length; i++) {
            if (this.boneList[i]["pp"]) {
                this.setBoneParent(this.boneList[i], this.boneList[i]["pp"]);
            }
        }
        this.setBoneTransform();
    };
    main.prototype.setBoneParent = function (bone, parent) {
        var obj = {};
        for (var i = 0; i < this.boneList.length; i++) {
            obj = this.boneList[i];
            if (obj["name"] == parent) {
                bone["parent"] = this.boneList[i];
            }
        }
    };
    main.prototype.setBoneTransform = function () {
        this.boneMatrix = [];
        for (var i = 0; i < this.boneList.length; i++) {
            var pp = this.boneList[i];
            pp["matrix"] = this.createMatrix(pp["transform"]);
            if (pp["parent"] && pp["parent"]["matrix"]) {
                //this.concat(pp["matrix"],pp["parent"]["matrix"]);
                pp["matrix"].concatss(pp["parent"]["matrix"]);
            }
            this.boneMatrix[i] = pp["matrix"];
        }
    };
    main.prototype.concat = function (m1, m) {
        var ma = m["a"];
        var mb = m["b"];
        var mc = m["c"];
        var md = m["d"];
        var tx1 = m1.tx;
        var ty1 = m1.ty;
        if (ma != 1 || mb != 0 || mc != 0 || md != 1) {
            var a1 = m1.a;
            var b1 = m1.b;
            var c1 = m1.c;
            var d1 = m1.d;
            m1.a = a1 * ma + b1 * mc;
            m1.b = a1 * mb + b1 * md;
            m1.c = c1 * ma + d1 * mc;
            m1.d = c1 * mb + d1 * md;
        }
        m1.tx = tx1 * ma + ty1 * mc + m["tx"];
        m1.ty = tx1 * mb + ty1 * md + m["ty"];
    };
    main.prototype.createMatrix = function (transform) {
        var dbTransform = new DBTransform();
        if (transform) {
            dbTransform.x = transform["x"] ? transform["x"] : 0;
            dbTransform.y = transform["y"] ? transform["y"] : 0;
            dbTransform.skewX = transform["skewX"] ? transform["skewX"] * (Math.PI / 180) : 0;
            dbTransform.skewY = transform["skewY"] ? transform["skewY"] * (Math.PI / 180) : 0;
            dbTransform.scaleX = transform["scaleX"] ? transform["scaleX"] : 1;
            dbTransform.scaleY = transform["scaleY"] ? transform["scaleY"] : 1;
        }
        var m = new Matrix();
        this.transformToMatrix(dbTransform, m);
        return m;
    };
    main.prototype.transformToMatrix = function (transform, matrix) {
        matrix.a = transform.scaleX * Math.cos(transform.skewY);
        matrix.b = transform.scaleX * Math.sin(transform.skewY);
        matrix.c = -transform.scaleY * Math.sin(transform.skewX);
        matrix.d = transform.scaleY * Math.cos(transform.skewX);
        matrix.tx = transform.x;
        matrix.ty = transform.y;
    };
    main.prototype.createWeightedMeshData = function (displayObj, verticesList) {
        var dbVertices = [];
        var spineVertices = verticesList;
        var numBone;
        var len;
        var weights = [];
        var i;
        var k;
        var kLen;
        var bbList = [];
        for (i = 0, len = spineVertices.length; i < len;) {
            numBone = spineVertices[i];
            weights.push(numBone);
            for (k = i + 1; k < (i + numBone * 4 + 1); k += 4) {
                weights.push(spineVertices[k]);
                if (bbList.indexOf(spineVertices[k]) == -1) {
                    bbList.push(spineVertices[k]);
                }
                weights.push(spineVertices[k + 3]);
            }
            i += numBone * 4 + 1;
        }
        //displayObj["vertices"] = [];
        while (spineVertices.length > 0) {
            numBone = spineVertices[0];
            len = numBone * 4 + 1;
            var arr = spineVertices.splice(0, len);
            var p = this.getVertex(arr);
            //displayObj["vertices"].push(p.x, p.y);
            dbVertices.push(p.x, p.y);
        }
        displayObj["type"] = "mesh";
        displayObj["vertices"] = dbVertices;
        displayObj["bonePose"] = this.getBonePose(bbList);
        displayObj["slotPose"] = [1, 0, 0, 1, 0, 0];
        displayObj["weights"] = weights;
    };
    main.prototype.getVertex = function (arr) {
        var i;
        var len;
        var tboneMatrix;
        var w;
        var p = new Point();
        var vertex = new Point();
        for (i = 1, len = arr.length; i < len; i += 4) {
            tboneMatrix = this.getBoneMatrix(arr[i]);
            p.x = arr[i + 1];
            p.y = -arr[i + 2];
            w = arr[i + 3];
            p = this.transformPoint(tboneMatrix, p.x, p.y);
            vertex.x += p.x * w;
            vertex.y += p.y * w;
        }
        return vertex;
    };
    main.prototype.transformPoint = function (m, pointX, pointY) {
        var x = m.a * pointX + m.c * pointY + m.tx;
        var y = m.b * pointX + m.d * pointY + m.ty;
        return new Point(x, y);
    };
    main.prototype.getBoneMatrix = function (index) {
        return this.boneMatrix[index];
    };
    main.prototype.getBonePose = function (bbList) {
        var a = [];
        var i;
        var len;
        var bNum;
        for (i = 0, len = bbList.length; i < len; i++) {
            bNum = bbList[i];
            a.push(bNum, this.boneMatrix[bNum].a, this.boneMatrix[bNum].b, this.boneMatrix[bNum].c, this.boneMatrix[bNum].d, this.boneMatrix[bNum].tx, this.boneMatrix[bNum].ty);
        }
        return a;
    };
    main.prototype.test = function (json){
        main.prototype.convertToDBData(json);
    };
    return main;
} (DBImportTemplate));
